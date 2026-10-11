#!/usr/bin/env bun
// SessionEnd hook: if the Claude Code session invoked any project-specific
// skill (research-token, research-token-exposure, seed-token-forum), upload
// the full session JSONL to Convex file storage and upsert a
// claudeSessionLogs row keyed by sessionId.
//
// Wired from .claude/settings.json on the SessionEnd event. The harness
// pipes a JSON payload to stdin with at least: session_id, transcript_path,
// cwd, hook_event_name. We never throw — failure is logged and exit is 0
// so a broken hook never blocks the CLI from exiting.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Load .env.local / .env from the project root so the hook works regardless of
// the shell that fires it (CWD may be wrong; we resolve relative to this file).
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env"]) {
  const file = path.join(PROJECT_ROOT, name);
  if (!fs.existsSync(file)) continue;
  for (const rawLine of fs.readFileSync(file, "utf-8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const TRACKED_SKILLS = new Set(["research-token", "research-token-exposure", "seed-token-forum"]);

type HookInput = {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
};

type SkillInvocation = {
  skillName: string;
  invokedAt?: string;
  target?: string;
  executionRef?: string;
  // Legacy alias for deployments that have not narrowed yet.
  localRunId?: string;
};

type ExecutionRef = {
  executionRef: string;
  firstSeenIndex: number;
  lastSeenIndex: number;
};

// e.g. "20260430142740-research-token-a1b2c3d4"
const LOCAL_RUN_ID_RE = /\b(\d{14}-[a-z][a-z0-9-]*-[a-f0-9]{8})\b/g;

function resolveConvexUrl(): string | null {
  return (
    process.env.CONVEX_URL ||
    process.env.VITE_CONVEX_URL ||
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    null
  );
}

function resolveConvexProdUrl(): string | null {
  return process.env.CONVEX_PROD_URL || null;
}

// For each LOCAL_RUN_ID seen in the transcript, read its manifest and check
// whether any of them recorded a dev-only touch. All sessions default to prod;
// only explicitly dev-only manifests stay on dev. (Prod is the canonical store.)
function pickUploadDeployment(executionRefs: ExecutionRef[]): "prod" | "dev" {
  const cwd = process.cwd();
  for (const ref of executionRefs) {
    const manifestPath = path.join(cwd, ".research-runs", ref.executionRef, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (manifest?.convexDeployment === "prod") return "prod";
    } catch {
      // Ignore malformed manifests — treat as no prod signal.
    }
  }
  return "prod";
}

async function readStdinJson<T>(): Promise<T | null> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const text = Buffer.concat(chunks).toString("utf-8").trim();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Walk every JSONL line and pull out Skill invocations + adjacent --target
// / LOCAL_RUN_ID hints from nearby bash commands.
function scanTranscript(transcriptPath: string): {
  invocations: SkillInvocation[];
  executionRefs: ExecutionRef[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
} {
  const invocations: SkillInvocation[] = [];
  const executionRefMap = new Map<string, ExecutionRef>();
  let firstSeenAt: string | null = null;
  let lastSeenAt: string | null = null;

  const raw = fs.readFileSync(transcriptPath, "utf-8");
  const allLines = raw.split("\n");
  // We index over *non-empty* lines to align with what the UI parses/renders.
  let parsedIndex = -1;
  for (const line of allLines) {
    if (!line.trim()) continue;
    parsedIndex++;
    for (const match of line.matchAll(LOCAL_RUN_ID_RE)) {
      const id = match[1];
      const prior = executionRefMap.get(id);
      if (prior) {
        prior.lastSeenIndex = parsedIndex;
      } else {
        executionRefMap.set(id, {
          executionRef: id,
          firstSeenIndex: parsedIndex,
          lastSeenIndex: parsedIndex,
        });
      }
    }
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const ts: string | undefined = event.timestamp || event.time;
    if (ts) {
      if (!firstSeenAt || ts < firstSeenAt) firstSeenAt = ts;
      if (!lastSeenAt || ts > lastSeenAt) lastSeenAt = ts;
    }

    const blocks = collectContentBlocks(event);
    for (const block of blocks) {
      if (block?.type !== "tool_use") continue;
      // Direct Skill tool invocation
      if (block.name === "Skill") {
        const skillName: string | undefined =
          block.input?.skill ?? block.input?.skill_name ?? block.input?.name;
        if (skillName && TRACKED_SKILLS.has(skillName)) {
          invocations.push({
            skillName,
            invokedAt: ts,
            target: extractTargetFromArgs(block.input?.args),
          });
        }
      }
      // Bash invocations of `bun run research-run:start ... --skill <name> --target <t>`
      if (block.name === "Bash" && typeof block.input?.command === "string") {
        const cmd: string = block.input.command;
        const skillMatch = cmd.match(/--skill[= ]+([\w-]+)/);
        if (skillMatch && TRACKED_SKILLS.has(skillMatch[1])) {
          invocations.push({
            skillName: skillMatch[1],
            invokedAt: ts,
            target: extractTargetFromFlag(cmd),
          });
        }
      }
    }
  }

  // Deduplicate: collapse repeated (skillName, target) pairs into the earliest.
  const dedup = new Map<string, SkillInvocation>();
  for (const inv of invocations) {
    const key = `${inv.skillName}::${inv.target ?? ""}`;
    const prior = dedup.get(key);
    if (!prior || (inv.invokedAt && prior.invokedAt && inv.invokedAt < prior.invokedAt)) {
      dedup.set(key, inv);
    }
  }
  const executionRefs = [...executionRefMap.values()].sort(
    (a, b) => a.firstSeenIndex - b.firstSeenIndex,
  );
  return { invocations: [...dedup.values()], executionRefs, firstSeenAt, lastSeenAt };
}

function collectContentBlocks(event: any): any[] {
  // Claude Code JSONL stores messages under several shapes; pull content arrays out wherever they live.
  const out: any[] = [];
  const candidates = [event?.message?.content, event?.content, event?.toolUse, event?.tool_use];
  for (const c of candidates) {
    if (Array.isArray(c)) out.push(...c);
    else if (c && typeof c === "object") out.push(c);
  }
  return out;
}

function extractTargetFromArgs(args: unknown): string | undefined {
  if (typeof args !== "string") return undefined;
  const flag = extractTargetFromFlag(args);
  if (flag) return flag;
  // `chain:0xADDR`
  const colon = args.match(/\b([a-z][a-z0-9-]*):0x[0-9a-fA-F]{40}\b/);
  if (colon) return colon[0];
  // `chain 0xADDR` (space-separated as users actually type) — normalize to chain:addr
  const spaced = args.match(/\b([a-z][a-z0-9-]*)\s+(0x[0-9a-fA-F]{40})\b/i);
  if (spaced) return `${spaced[1].toLowerCase()}:${spaced[2].toLowerCase()}`;
  // Bare 0x address
  const bare = args.match(/\b0x[0-9a-fA-F]{40}\b/);
  if (bare) return bare[0].toLowerCase();
  // Bare token symbol (2-10 alphanumeric, all upper-or-mixed) — last-resort signal.
  const sym = args.trim().match(/^([A-Za-z][A-Za-z0-9]{1,9})$/);
  if (sym) return sym[1].toUpperCase();
  return undefined;
}

function extractTargetFromFlag(text: string): string | undefined {
  const m =
    text.match(/--target[= ]+"([^"]+)"/) ||
    text.match(/--target[= ]+'([^']+)'/) ||
    text.match(/--target[= ]+([^\s]+)/);
  return m?.[1];
}

function resolveAuthorLabel(): string | undefined {
  return (
    process.env.HERD_AUTHOR ||
    process.env.GIT_AUTHOR_EMAIL ||
    process.env.USER ||
    process.env.LOGNAME ||
    undefined
  );
}

async function main() {
  const input = (await readStdinJson<HookInput>()) ?? {};
  const sessionId = input.session_id;
  const transcriptPath = input.transcript_path;

  if (!sessionId || !transcriptPath) {
    return;
  }
  if (!fs.existsSync(transcriptPath)) {
    return;
  }

  const { invocations, executionRefs, firstSeenAt, lastSeenAt } = scanTranscript(transcriptPath);
  if (invocations.length === 0) {
    return;
  }

  const deployment = pickUploadDeployment(executionRefs);
  const prodUrl = resolveConvexProdUrl();
  const devUrl = resolveConvexUrl();
  const convexUrl = deployment === "prod" ? (prodUrl ?? devUrl) : devUrl;
  if (!convexUrl) {
    console.error(
      "[upload-claude-session] no CONVEX_URL / VITE_CONVEX_URL / CONVEX_PROD_URL set; skipping upload",
    );
    return;
  }
  if (deployment === "prod" && !prodUrl) {
    console.error(
      "[upload-claude-session] CONVEX_PROD_URL not set; transcript routed to dev URL instead",
    );
  }

  const stat = fs.statSync(transcriptPath);
  const targets = Array.from(
    new Set(invocations.map((i) => i.target).filter((t): t is string => Boolean(t))),
  );

  const client = new ConvexHttpClient(convexUrl);
  const uploadUrl: string = await client.mutation(api.claudeSessionLogs.generateUploadUrl, {});
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-ndjson" },
    body: Bun.file(transcriptPath),
  });
  if (!response.ok) {
    throw new Error(`upload failed: ${response.status} ${await response.text().catch(() => "")}`);
  }
  const { storageId } = (await response.json()) as { storageId: string };

  const now = new Date().toISOString();
  await client.mutation(api.claudeSessionLogs.upsertSession, {
    sessionId,
    agentKind: "claude",
    storageId: storageId as any,
    byteLength: stat.size,
    skillsInvoked: invocations,
    targets,
    authorLabel: resolveAuthorLabel(),
    executionRefs,
    runRefs: executionRefs.map((ref) => ({
      localRunId: ref.executionRef,
      firstSeenIndex: ref.firstSeenIndex,
      lastSeenIndex: ref.lastSeenIndex,
    })),
    firstSeenAt: firstSeenAt ?? now,
    lastSeenAt: lastSeenAt ?? now,
  });

  console.error(
    `[upload-claude-session] uploaded ${path.basename(transcriptPath)} ` +
      `(${stat.size} bytes, ${invocations.length} skill invocations, ` +
      `${targets.length} targets, ${executionRefs.length} executions) → ${deployment}`,
  );
}

main().catch((err) => {
  console.error("[upload-claude-session] failed:", err?.message ?? err);
  process.exit(0);
});
