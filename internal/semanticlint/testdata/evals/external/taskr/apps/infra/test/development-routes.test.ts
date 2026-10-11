import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import worker, { type Env, type Task } from "../src/worker";
import type { DevelopmentRun } from "../src/development-contract";
import { d1 } from "./coding-test-db";

let db: Database;
let env: Env;
let started: Array<{ taskId: string; requestId: string }>;
let routed: string[];
const run = (taskId: string, id: string): DevelopmentRun => ({
  id, taskId, status: "queued", repositoryUrl: "https://github.com/example/taskr.git",
  ref: "HEAD", sourceRevision: "", createdAt: "2026-09-09T00:00:00.000Z",
  updatedAt: "2026-09-09T00:00:00.000Z", finishedAt: null, error: "", steps: [],
});
beforeEach(() => {
  db = new Database(":memory:");
  const migrations = new URL("../migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(new URL(name, migrations), "utf8"));
  }
  const prepare = (sql: string, values: unknown[] = []): unknown => ({
    bind: (...args: unknown[]) => prepare(sql, args),
    first: async () => db.query(sql).get(...values as (string | number | null)[]),
    all: async () => ({ results: db.query(sql).all(...values as (string | number | null)[]) }),
  });
  started = [];
  routed = [];
  const records = new Map<string, DevelopmentRun>();
  env = {
    DB: d1(db),
    ASSETS: { fetch: async () => new Response("app shell") } as unknown as Env["ASSETS"],
    TASKR_REPOSITORY_URL: "https://github.com/example/taskr.git",
    DEVELOPMENT_RUNNERS: {
      getByName(taskId) {
        routed.push(taskId);
        return {
          async history() { return Array.from(records.values()).filter((run) => run.taskId === taskId); },
          async lookup(requestId) { return records.get(`${taskId}/${requestId}`) ?? null; },
          async inventory() { return { activeRunId: null, fence: null, runs: [] }; },
          async start(taskId, requestId) {
            const key = `${taskId}/${requestId}`;
            const existing = records.get(key);
            if (existing) return { run: existing, created: false };
            started.push({ taskId, requestId });
            const created = run(taskId, requestId);
            records.set(key, created);
            return { run: created, created: true };
          },
        };
      },
    },
  };
});
afterEach(() => db.close());
const request = (path: string, method = "GET", body?: unknown, headers?: HeadersInit) =>
  worker.fetch(new Request(`http://localhost${path}`, {
    method, headers: { "Content-Type": "application/json", ...(method === "PUT" ? { "If-Match": `"${(db.query("SELECT revision FROM tasks WHERE id=?").get(path.split("/").at(-1)!) as { revision: number } | null)?.revision ?? 1}"` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), env);
const endpoint = (id = "TASK-101") => `/api/tasks/${id}/development-runs`;
const taskSnapshot = async () => (await (await request("/api/tasks")).json()) as { tasks: Task[] };

describe("development run API (fake runtime binding, real SQLite tasks)", () => {
  test("disabled stack remains usable and reports setup missing without dispatch", async () => {
    delete env.DEVELOPMENT_RUNNERS;
    const response = await request(endpoint());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ available: false, runs: [] });
    const post = await request(endpoint(), "POST", { requestId: crypto.randomUUID() });
    expect(post.status).toBe(503);
    expect((await post.json() as { error: string }).error).toContain("not configured");
    expect(started).toEqual([]);
    expect((await request("/api/tasks")).status).toBe(200);
  });
  test("missing repository never dispatches even with a runtime binding", async () => {
    delete env.TASKR_REPOSITORY_URL;
    expect((await request(endpoint(), "POST", { requestId: crypto.randomUUID() })).status).toBe(503);
    expect(routed).toEqual([]);
  });
  test("explicit start returns acceptance, retries preserve ID, history does not start work", async () => {
    const before = await taskSnapshot();
    const id = crypto.randomUUID();
    const accepted = await request(endpoint(), "POST", { requestId: id });
    expect(accepted.status).toBe(202);
    expect(await accepted.json()).toMatchObject({ created: true, run: { id, taskId: "TASK-101", status: "queued" } });
    const replay = await request(endpoint(), "POST", { requestId: id.toUpperCase() });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ created: false, run: { id } });
    const history = await request(endpoint());
    expect(await history.json()).toMatchObject({ available: true, unavailableReason: "", runs: [{ id }] });
    expect(started).toEqual([{ taskId: "TASK-101", requestId: id }]);
    expect(await taskSnapshot()).toEqual(before);
  });
  test("different tasks route to different instances; unknown tasks do not reach runtime", async () => {
    await request(endpoint("TASK-101"), "POST", { requestId: crypto.randomUUID() });
    await request(endpoint("TASK-102"), "POST", { requestId: crypto.randomUUID() });
    expect(routed).toEqual(["TASK-101", "TASK-102"]);
    for (const method of ["GET", "POST"]) {
      expect((await request(endpoint("missing"), method,
        method === "POST" ? { requestId: crypto.randomUUID() } : undefined)).status).toBe(404);
    }
    expect(routed).toHaveLength(2);
  });
  test("task create/save/status transitions never dispatch runs", async () => {
    const created = await request("/api/tasks", "POST", { title: "not execution", executor: "agent", status: "todo" });
    const task = (await created.json() as { task: Task }).task;
    await request(`/api/tasks/${task.id}`, "PUT", { status: "in-progress" });
    await request(`/api/tasks/${task.id}`, "PUT", { status: "todo" });
    expect(routed).toEqual([]);
    expect(started).toEqual([]);
  });
  test("cross-origin writes and unsupported methods cannot dispatch", async () => {
    expect((await request(endpoint(), "POST", { requestId: crypto.randomUUID() }, { Origin: "https://evil.example" })).status).toBe(403);
    for (const method of ["PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const response = await request(endpoint(), method);
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET, POST");
    }
    expect(routed).toEqual([]);
  });
  test("preserves dev proxy same-origin behavior without adding authentication", async () => {
    env.DEV_ORIGIN = "http://localhost:1337";
    const response = await request(endpoint(), "POST", { requestId: crypto.randomUUID() }, { Origin: env.DEV_ORIGIN });
    expect(response.status).toBe(202);
    // No Origin is also accepted: this endpoint is not authenticated.
    expect((await request(endpoint("TASK-102"), "POST", { requestId: crypto.randomUUID() })).status).toBe(202);
  });
  test("rejects malformed IDs, unknown fields, arbitrary commands, and invalid request IDs", async () => {
    expect((await request(endpoint("%ZZ"))).status).toBe(400);
    for (const body of [null, [], {}, { requestId: 7 }, { requestId: "not-a-uuid" },
      { requestId: crypto.randomUUID(), command: "echo should not execute" },
      { requestId: crypto.randomUUID(), taskId: "TASK-102" }]) {
      expect((await request(endpoint(), "POST", body)).status).toBe(400);
    }
    expect(routed).toEqual([]);
  });
  test("requires bounded JSON and reports runtime failure without leaking internals", async () => {
    expect((await request(endpoint(), "POST", { requestId: crypto.randomUUID() }, { "Content-Type": "text/plain" })).status).toBe(400);
    expect((await request(endpoint(), "POST", { requestId: "x".repeat(65536) })).status).toBe(400);
    const malformed = await worker.fetch(new Request(`http://localhost${endpoint()}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    }), env);
    expect(malformed.status).toBe(400);
    env.DEVELOPMENT_RUNNERS = { getByName() { throw new Error("fake runtime unavailable"); } };
    const response = await request(endpoint(), "POST", { requestId: crypto.randomUUID() });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("fake runtime unavailable");
    expect((await request("/api/tasks")).status).toBe(200);
  });
});
