import type { D1Database, Fetcher } from "@cloudflare/workers-types";
import type { DevelopmentRunnerBinding } from "./development-contract";
import { codingApi, CodingError } from "./coding-api";
import { startCheck } from "./coding-checks";
import type { CodingRuntimeStub } from "./coding-runtime-contract";
import { ContractError } from "../../../packages/coding-contract/src/index";

export interface Env {
  DB: D1Database;
  DEV_ORIGIN?: string;
  /** Opt-in spike bindings; ordinary task CRUD never invokes execution. */
  DEVELOPMENT_RUNNERS?: DevelopmentRunnerBinding;
  TASKR_REPOSITORY_URL?: string;
  /** Only the opt-in local entrypoint may supply these. Never production config. */
  TASKR_LOCAL_CODING?: string;
  TASKR_CODING_LIVE_ENABLED?: string;
  TASKR_CODING_RUNNER_PUBLIC_KEY?: string;
  CODING_RUNTIMES?: {
    getByName(name: string): CodingRuntimeStub;
    /** Native namespaces expose idFromName/get; omitted only in injected tests. */
    idFromName?: (name: string) => unknown;
    get?: (...args: unknown[]) => unknown;
  };
  ASSETS: Pick<Fetcher, "fetch">;
}

export const statuses = ["backlog", "todo", "in-progress", "review", "blocked", "done"] as const;
export const executors = ["agent", "human"] as const;
export const priorities = ["urgent", "high", "medium", "low"] as const;
export const labels = ["Feature", "Bug", "Design", "Improvement"] as const;
export interface Task {
  id: string;
  title: string;
  description: string;
  status: (typeof statuses)[number];
  priority: (typeof priorities)[number];
  label: (typeof labels)[number];
  assignee: string;
  executor: (typeof executors)[number];
  acceptanceCriteria: string;
  reviewer: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  archivedAt: string | null;
}

type TaskRow = Omit<Task, "createdAt" | "updatedAt" | "acceptanceCriteria" | "archivedAt"> & {
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  acceptance_criteria: string;
};
const toTask = ({ created_at, updated_at, acceptance_criteria, archived_at, ...row }: TaskRow): Task => ({
  ...row,
  archivedAt: archived_at,
  acceptanceCriteria: acceptance_criteria,
  createdAt: created_at,
  updatedAt: updated_at,
});

const json = (value: unknown, status = 200, extraHeaders?: HeadersInit) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
const error = (message: string, status: number) => json({ error: message }, status);

class InvalidInput extends Error {}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new InvalidInput("Content-Type must be application/json.");
  }
  // Bound input while streaming; do not trust Content-Length alone.
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidInput("A JSON object is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    // Allow all text fields at their limits, including JSON-escaped Unicode.
    if (size > 65536) {
      await reader.cancel();
      throw new InvalidInput("Request body must not exceed 64 KiB.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InvalidInput("Invalid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InvalidInput("A JSON object is required.");
  }
  return body as Record<string, unknown>;
}

function titleInput(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 500) {
    throw new InvalidInput("Title must contain 1 to 500 characters.");
  }
  return value.trim();
}

const fields = "id, title, description, status, priority, label, assignee, executor, acceptance_criteria, reviewer, created_at, updated_at, revision, archived_at";
const mutable = [
  "title", "description", "status", "priority", "label", "assignee",
  "executor", "acceptanceCriteria", "reviewer",
] as const;
type MutableKey = (typeof mutable)[number];
const columnFor = (key: MutableKey) => key === "acceptanceCriteria" ? "acceptance_criteria" : key;
const defaults = {
  description: "",
  status: "todo",
  priority: "medium",
  label: "Feature",
  assignee: "",
  executor: "agent",
  acceptanceCriteria: "",
  reviewer: "",
};

function validate(body: Record<string, unknown>, create: boolean): Record<string, string> {
  const keys = Object.keys(body);
  if (keys.some((key) => !mutable.includes(key as MutableKey))) {
    throw new InvalidInput("Unknown task field.");
  }
  if (!create && !keys.length) throw new InvalidInput("Supply at least one task field.");
  const result: Record<string, string> = create ? { ...defaults } : {};
  if (create || "title" in body) result.title = titleInput(body.title);
  for (const [key, max] of [
    ["description", 4000],
    ["assignee", 100],
    ["acceptanceCriteria", 4000],
    ["reviewer", 100],
  ] as const) {
    if (!(key in body)) continue;
    const value = body[key];
    if (typeof value !== "string" || value.length > max) {
      throw new InvalidInput(`${key} must be a string of at most ${max} characters.`);
    }
    result[key] = value.trim();
  }
  for (const [key, allowed] of [
    ["status", statuses],
    ["priority", priorities],
    ["label", labels],
    ["executor", executors],
  ] as const) {
    if (!(key in body)) continue;
    const value = body[key];
    if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
      throw new InvalidInput(`Invalid ${key}. Allowed values: ${allowed.join(", ")}.`);
    }
    result[key] = value;
  }
  return result;
}

function revisionHeader(request: Request): number {
  const value = request.headers.get("If-Match");
  if (!value) throw new CodingError("If-Match task revision is required.", 428);
  if (!/^"[1-9][0-9]*"$/.test(value) || !Number.isSafeInteger(Number(value.slice(1,-1)))) throw new InvalidInput("If-Match must be a quoted numeric revision.");
  return Number(value.slice(1,-1));
}
async function taskConflict(env: Env, id: string): Promise<Response> {
  const exists = await env.DB.prepare("SELECT id FROM tasks WHERE id=?").bind(id).first();
  return error(exists ? "Task revision, archive state, or execution reservation changed." : "Task not found.", exists ? 409 : 404);
}
async function api(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  const coding = await codingApi(request, env);
  if (coding) return coding;
  if (path === "/api/tasks") {
    if (request.method === "GET") {
      const query = new URL(request.url).searchParams;
      const includeArchived = query.get("includeArchived");
      if (query.getAll("includeArchived").length > 1 || (includeArchived !== null && includeArchived !== "1" && includeArchived !== "0")) throw new InvalidInput("includeArchived must be 0 or 1.");
      const result = await env.DB.prepare(
        `SELECT ${fields} FROM tasks ${includeArchived === "1" ? "" : "WHERE archived_at IS NULL"} ORDER BY created_at DESC, id ASC`,
      ).all<TaskRow>();
      return json({ tasks: result.results.map(toTask) });
    }
    if (request.method === "POST") {
      const body = validate(await readBody(request), true);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const row = await env.DB.prepare(
        `INSERT INTO tasks (${fields}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL) RETURNING ${fields}`,
      )
        .bind(
          id,
          body.title!,
          body.description!,
          body.status!,
          body.priority!,
          body.label!,
          body.assignee!,
          body.executor!,
          body.acceptanceCriteria!,
          body.reviewer!,
          now,
          now,
        )
        .first<TaskRow>();
      if (!row) throw new Error("Task insert returned no row");
      return json({ task: toTask(row) }, 201);
    }
    return json({ error: "Method not allowed." }, 405, { Allow: "GET, POST" });
  }

  const runMatch = /^\/api\/tasks\/([^/]+)\/development-runs$/.exec(path);
  if (runMatch) {
    let taskId: string;
    try {
      taskId = decodeURIComponent(runMatch[1]!);
    } catch {
      return error("Invalid task ID.", 400);
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, { Allow: "GET, POST" });
    }
    const task = await env.DB.prepare("SELECT id FROM tasks WHERE id = ?")
      .bind(taskId).first<{ id: string }>();
    if (!task) return error("Task not found.", 404);
    const unavailableReason = !env.DEVELOPMENT_RUNNERS || !env.TASKR_REPOSITORY_URL
      ? "Development runs are not configured. Enable the Cloudflare sandbox spike and configure the Taskr repository."
      : env.TASKR_LOCAL_CODING === "1" ? "Check admission is disabled in coding mode; retained history remains readable." : "";
    if (request.method === "GET") {
      return json({
        available: !unavailableReason,
        unavailableReason,
        runs: env.DEVELOPMENT_RUNNERS ? await env.DEVELOPMENT_RUNNERS.getByName(taskId).history() : [],
      });
    }
    const body = await readBody(request);
    if (Object.keys(body).some((key) => key !== "requestId")) {
      throw new InvalidInput("Unknown development run field.");
    }
    if (typeof body.requestId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
      throw new InvalidInput("requestId must be a UUID v4.");
    }
    if (unavailableReason) return error(unavailableReason, 503);
    const result = await startCheck(env, taskId, body.requestId.toLowerCase());
    return json(result, result.created ? 202 : 200);
  }

  const archive = /^\/api\/tasks\/([^/]+)\/archive$/.exec(path);
  if (archive) {
    if (request.method !== "POST") return error("Method not allowed.", 405);
    if (request.body && Object.keys(await readBody(request)).length) throw new InvalidInput("Unknown archive field.");
    const id = decodeURIComponent(archive[1]!);
    const expected = revisionHeader(request);
    if (await env.DB.prepare("SELECT id FROM coding_workspace WHERE legacy_inventory_required=1 OR maintenance=1").first()) return error("Legacy execution inventory must be verified before archiving tasks.", 409);
    const row = await env.DB.prepare(`UPDATE tasks SET archived_at=?, revision=revision+1, updated_at=?
      WHERE id=? AND revision=? AND archived_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM execution_reservations WHERE task_id=tasks.id) RETURNING ${fields}`)
      .bind(new Date().toISOString(), new Date().toISOString(), id, expected).first<TaskRow>();
    if (row) return json({ task: toTask(row) });
    return taskConflict(env, id);
  }
  const match = /^\/api\/tasks\/([^/]+)$/.exec(path);
  if (!match) return error("Not found.", 404);
  let id: string;
  try {
    id = decodeURIComponent(match[1]!);
  } catch {
    return error("Invalid task ID.", 400);
  }
  if (request.method === "GET") {
    const row = await env.DB.prepare(`SELECT ${fields} FROM tasks WHERE id=?`).bind(id).first<TaskRow>();
    return row ? json({ task: toTask(row) }) : error("Task not found.", 404);
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    const body = validate(await readBody(request), false);
    const expected = revisionHeader(request);
    // Column names come only from the fixed allow-list, never from user input.
    // Partial edits are atomic and cannot overwrite unrelated concurrent edits.
    const keys = mutable.filter((key) => key in body);
    const assignments = keys.map((key) => `${columnFor(key)} = ?`).join(", ");
    const changed = keys.map((key) => `${columnFor(key)} IS NOT ?`).join(" OR ");
    const values = keys.map((key) => body[key]!);
    // SQLite evaluates every RHS against the same old row. Normalized equal
    // values are a no-op, but the revision predicate still rejects stale edits.
    const row = await env.DB.prepare(
      `UPDATE tasks SET ${assignments}, updated_at = CASE WHEN ${changed} THEN ? ELSE updated_at END,
        revision=revision + CASE WHEN ${changed} THEN 1 ELSE 0 END
        WHERE id = ? AND revision=? AND archived_at IS NULL RETURNING ${fields}`,
    )
      .bind(...values, ...values, new Date().toISOString(), ...values, id, expected)
      .first<TaskRow>();
    return row ? json({ task: toTask(row) }) : taskConflict(env, id);
  }
  if (request.method === "DELETE") {
    const exists = await env.DB.prepare("SELECT id FROM tasks WHERE id=?").bind(id).first();
    if (!exists) return error("Task not found.", 404);
    if (await env.DB.prepare("SELECT id FROM coding_workspace WHERE legacy_inventory_required=1 OR maintenance=1").first()) return error("Legacy execution inventory must be verified before deleting tasks.", 409);
    if (env.DEVELOPMENT_RUNNERS) {
      const history = await env.DEVELOPMENT_RUNNERS.getByName(id).history();
      if (history.length) return error("retained_history: archive this task instead.", 409);
    }
    const retained = await env.DB.prepare(`SELECT id FROM tasks WHERE id=? AND (
      EXISTS(SELECT 1 FROM coding_runs WHERE task_id=tasks.id) OR
      EXISTS(SELECT 1 FROM execution_reservations WHERE task_id=tasks.id) OR
      EXISTS(SELECT 1 FROM check_requests WHERE task_id=tasks.id) OR
      EXISTS(SELECT 1 FROM check_evidence WHERE task_id=tasks.id))`).bind(id).first();
    if (retained) return error("retained_history: archive this task instead.", 409);
    const row = await env.DB.prepare("DELETE FROM tasks WHERE id = ? RETURNING id")
      .bind(id)
      .first<{ id: string }>();
    return row
      ? new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
      : error("Task not found.", 404);
  }
  return json({ error: "Method not allowed." }, 405, { Allow: "GET, PUT, PATCH, DELETE" });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path !== "/api" && !path.startsWith("/api/")) {
      // Request/Response globals differ slightly between Bun and workers-types.
      return env.ASSETS.fetch(request as never) as unknown as Promise<Response>;
    }
    // This single-user MVP intentionally has no auth. Same-origin JSON requests
    // and no CORS prevent other websites from driving browser writes.
    const origin = request.headers.get("Origin");
    if (
      origin &&
      origin !== new URL(request.url).origin &&
      origin !== env.DEV_ORIGIN &&
      request.method !== "GET"
    ) {
      return error("Cross-origin writes are not allowed.", 403);
    }
    try {
      return await api(request, env);
    } catch (cause) {
      if (cause instanceof InvalidInput || cause instanceof ContractError || cause instanceof URIError) return error(cause.message, 400);
      if (cause instanceof CodingError) return error(cause.message, cause.status);
      if (cause instanceof Error && /retained_history|active_run/.test(cause.message)) return error("Task has retained execution evidence or an active reservation.", 409);
      const developmentRunRequest = /^\/api\/tasks\/[^/]+\/development-runs$/.test(path);
      console.error(developmentRunRequest ? "Development run API failed" : "Task API failed", cause);
      return error(developmentRunRequest
        ? "Could not access development runs. Please refresh to reconcile before starting again."
        : "Could not access tasks. Please try again.", 500);
    }
  },
};
