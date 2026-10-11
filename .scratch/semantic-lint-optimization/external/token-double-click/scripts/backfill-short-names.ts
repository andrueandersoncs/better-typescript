#!/usr/bin/env bun
/**
 * Backfill `shortName` on every non-token node by asking an OpenAI chat model
 * to author a concise label. Reads targets via the deployment's
 * `migrations:listShortNameBackfillTargets` internal query and writes back
 * via `migrations:applyShortNamesBatch`. Both are invoked through
 * `npx convex run` so they inherit deployment-admin auth — no API token or
 * client-side admin gating needed.
 *
 * The script auto-loads `OPENAI_API_KEY` from `./.env.local` if it isn't
 * already exported, so you can run it bare (`bun scripts/backfill-short-names.ts`)
 * without copying secrets onto the command line.
 *
 * Usage:
 *   bun scripts/backfill-short-names.ts                  # dev, OPENAI_API_KEY from .env.local
 *   bun scripts/backfill-short-names.ts --prod           # prod
 *   bun scripts/backfill-short-names.ts --force          # re-author rows that already have a shortName
 *   bun scripts/backfill-short-names.ts --dry            # generate only, do not write
 *   bun scripts/backfill-short-names.ts --limit 50       # process at most N rows
 *   bun scripts/backfill-short-names.ts --model gpt-4.1-mini  # override model
 *
 * The LLM prompt explicitly asks for the kind of compression a human would
 * do (drop "Fund"/"Protocol"/"Inc.", keep distinguishing modifiers, prefer
 * widely-recognized abbreviations). Output is constrained to <=24 chars.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type Target = {
  nodeId: string;
  kind: "manager" | "balance" | "aggregate" | "offchainAsset";
  identityKey: string;
  fullName: string;
  currentShort: string | null;
  hint: {
    entityType?: string;
    chain?: string;
    custodian?: string;
    id?: string;
    positionNoun?: string;
  };
};

type Args = {
  prod: boolean;
  force: boolean;
  dry: boolean;
  limit: number | null;
  batchSize: number;
  model: string;
};

const DEFAULT_MODEL = "gpt-4.1-mini";

function parseArgs(argv: string[]): Args {
  const out: Args = {
    prod: false,
    force: false,
    dry: false,
    limit: null,
    batchSize: 20,
    model: DEFAULT_MODEL,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--prod") out.prod = true;
    else if (a === "--force") out.force = true;
    else if (a === "--dry") out.dry = true;
    else if (a === "--limit") {
      const next = argv[++i];
      if (!next) throw new Error("--limit requires a value");
      out.limit = Number(next);
      if (!Number.isFinite(out.limit) || out.limit <= 0)
        throw new Error("--limit must be a positive number");
    } else if (a === "--batch") {
      const next = argv[++i];
      if (!next) throw new Error("--batch requires a value");
      out.batchSize = Number(next);
      if (!Number.isFinite(out.batchSize) || out.batchSize <= 0) {
        throw new Error("--batch must be a positive number");
      }
    } else if (a === "--model") {
      const next = argv[++i];
      if (!next) throw new Error("--model requires a value");
      out.model = next;
    } else {
      throw new Error(`unknown arg ${a}`);
    }
  }
  return out;
}

/**
 * Read OPENAI_API_KEY from the repo's `.env.local` without polluting
 * `process.env` for unrelated variables — keeps this script side-effect-free
 * outside the one variable it needs. Returns null when the file or key is
 * absent so the caller can fall back to the live environment.
 */
function loadApiKeyFromEnvLocal(): string | null {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const contents = readFileSync(envPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (key !== "OPENAI_API_KEY") continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || null;
  }
  return null;
}

function convexRun(args: Args, fn: string, fnArgs?: unknown): unknown {
  const cli = ["convex", "run"];
  if (args.prod) cli.push("--prod");
  cli.push(fn);
  if (fnArgs !== undefined) cli.push(JSON.stringify(fnArgs));
  // `npx convex run` prints status lines on stderr and the JSON result on
  // stdout. Capture stdout and parse.
  const stdout = execFileSync("npx", cli, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 200 * 1024 * 1024,
  });
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some `convex run` outputs include log noise even with stdio=inherit on
    // stderr. Find the last JSON value in stdout.
    const lastBrace = trimmed.lastIndexOf("}");
    const lastBracket = trimmed.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);
    if (end < 0) throw new Error(`could not parse convex run output: ${trimmed.slice(0, 200)}`);
    const slice = trimmed.slice(0, end + 1);
    const startBrace = slice.indexOf("{");
    const startBracket = slice.indexOf("[");
    const start =
      startBrace < 0
        ? startBracket
        : startBracket < 0
          ? startBrace
          : Math.min(startBrace, startBracket);
    return JSON.parse(slice.slice(start));
  }
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You author concise labels for nodes in a tokenized-asset balance sheet.

Each input is a node with a long name and a kind. Return a SHORT label (<= 24 characters) that:

- Drops boilerplate: "Fund", "Protocol", "Pool", "Vault", "Inc.", "LLC", "Limited", "Corp", "v3 / v4 / v2" suffixes when redundant, redundant chain names when the surrounding UI already shows the chain, "the" articles.
- Keeps distinguishing modifiers ("Government MMF" not just "MMF"; "Aave v3" stays only when v3 vs v2 disambiguation matters in the brand).
- Prefers widely-recognized abbreviations ("BNY Mellon Government Money Market Fund" -> "BNY Gov MMF"; "Circle Internet Financial" -> "Circle"; "Wormhole Token Bridge Custody" -> "Wormhole Custody").
- Never fabricates a name. If the full name is already short and clear, return it as-is.
- For market/pool ids that look like hex hashes ("0xabc..."), keep the readable prefix only (e.g. "Morpho Blue 0xab...cd").
- Returns plain text only, no quotes, no trailing punctuation.

Respond with exactly one JSON object: {"shortName": "..."}.`;

type LlmInput = {
  kind: string;
  fullName: string;
  hint: Target["hint"];
};

async function authorShortName(input: LlmInput, apiKey: string, model: string): Promise<string> {
  const userMessage = JSON.stringify(input);
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`openai ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("openai: empty response");
  let parsed: { shortName?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`openai: non-json response: ${content.slice(0, 200)}`);
  }
  if (typeof parsed.shortName !== "string" || parsed.shortName.length === 0) {
    throw new Error(`openai: missing shortName in ${content.slice(0, 200)}`);
  }
  // Hard cap; the prompt asks for 24 but trim defensively.
  return parsed.shortName.trim().slice(0, 32);
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY ?? loadApiKeyFromEnvLocal();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required (set in env or .env.local)");
  }

  const targets = convexRun(args, "migrations:listShortNameBackfillTargets") as Target[];
  if (!Array.isArray(targets)) throw new Error("expected array of targets");

  const filtered = targets.filter((t) => {
    if (!t.fullName) return false;
    if (!args.force && t.currentShort) return false;
    return true;
  });
  const work = args.limit !== null ? filtered.slice(0, args.limit) : filtered;

  console.log(
    `[backfill-short-names] env=${args.prod ? "prod" : "dev"} total=${targets.length} candidates=${filtered.length} processing=${work.length}${args.dry ? " (dry run)" : ""}`,
  );

  const entries: Array<{ nodeId: string; shortName: string }> = [];
  let llmFailures = 0;

  for (let i = 0; i < work.length; i++) {
    const target = work[i];
    const llmInput: LlmInput = {
      kind: target.kind,
      fullName: target.fullName,
      hint: target.hint,
    };
    try {
      const shortName = await authorShortName(llmInput, apiKey, args.model);
      entries.push({ nodeId: target.nodeId, shortName });
      console.log(`  ${i + 1}/${work.length} [${target.kind}] ${target.fullName} -> ${shortName}`);
    } catch (err) {
      llmFailures++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ${i + 1}/${work.length} [${target.kind}] ${target.fullName} -> FAIL ${msg}`);
    }
    // Light rate-limit cushion; Haiku is fast but we don't need to burn rate.
    await sleep(80);
  }

  console.log(
    `[backfill-short-names] generated=${entries.length} failures=${llmFailures}${args.dry ? " (dry — skipping write)" : ""}`,
  );

  if (args.dry || entries.length === 0) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  // Convex args have a max payload size; chunk the writes.
  for (let i = 0; i < entries.length; i += args.batchSize) {
    const chunk = entries.slice(i, i + args.batchSize);
    const result = convexRun(args, "migrations:applyShortNamesBatch", { entries: chunk });
    console.log(
      `[backfill-short-names] applied chunk ${i / args.batchSize + 1}: ${JSON.stringify(result)}`,
    );
  }

  console.log("[backfill-short-names] done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
