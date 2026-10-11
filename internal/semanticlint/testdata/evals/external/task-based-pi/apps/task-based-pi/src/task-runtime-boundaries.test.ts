import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskWorkBoundary } from "./task-lifecycle.ts";
import { TaskLibrary } from "./task-library.ts";
import { TaskModel } from "./task-model.ts";
import { persistenceLayer } from "./layers.ts";
import { taskRuntimeBoundaries } from "./task-runtime-boundaries.ts";

const fakePiSource = `#!/usr/bin/env bun
const sessionId = process.argv[process.argv.indexOf("--session-id") + 1] || "";
if (!/^[A-Za-z0-9]+$/.test(sessionId)) {
  process.stderr.write("Session id must contain only alphanumeric characters\\n");
  process.exit(64);
}
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  for (;;) {
    const newline = buffer.indexOf("\\n");
    if (newline < 0) break;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line.trim()) continue;
    const command = JSON.parse(line);
    process.stdout.write(JSON.stringify({ type: "response", command: command.type, id: command.id, success: true }) + "\\n");
    if (command.type === "prompt") {
      process.stdout.write(JSON.stringify({ type: "tool_execution_start", toolName: "read" }) + "\\n");
      for (let index = 0; index < 2_000; index += 1) {
        process.stdout.write(JSON.stringify({
          type: "message_update",
          assistantMessageEvent: { type: "text_delta", delta: "repeated streaming text" },
        }) + "\\n");
      }
    }
    if (command.type === "steer") {
      process.stdout.write(JSON.stringify({
        type: "message_end",
        message: { role: "assistant", content: [{ type: "text", text: "heard: " + command.message }] },
      }) + "\\n");
      setTimeout(() => process.stdout.write(JSON.stringify({ type: "agent_settled" }) + "\\n"), 30);
    }
  }
});
process.stdin.on("end", () => process.exit(0));
`;

describe("task runtime steer delivery", () => {
  test("writes a pending operator message to the live Pi stdin", async () => {
    const directory = await mkdtemp(join(tmpdir(), "steer-delivery-"));
    try {
      const script = join(directory, "fake-pi.ts");
      await writeFile(script, fakePiSource);
      await chmod(script, 0o755);
      const databasePath = join(directory, "state.sqlite");
      const layer = taskRuntimeBoundaries({
        command: script,
        sessionDirectory: join(directory, "sessions"),
        workingDirectory: directory,
        dataDirectory: directory,
        workspaceRootDirectory: join(directory, "workspaces"),
        databasePath,
      }).pipe(Layer.provideMerge(persistenceLayer(databasePath)));
      const { result, delivered } = await Effect.runPromise(Effect.gen(function*() {
        const library = yield* TaskLibrary;
        const model = yield* TaskModel;
        const sql = yield* SqlClient.SqlClient;
        const work = yield* TaskWorkBoundary;
        const task = yield* library.createTask({ title: "Steer me", description: "Keep going" });
        const trigger = (yield* model.triggersForTask(task.id))[0]!;
        const admission = yield* model.admitTrigger({ triggerId: trigger.id, occurrenceKey: "operator:1" });
        const taskAttempt = yield* model.startAttempt(admission.attempt!.id);
        yield* sql`INSERT INTO task_operator_messages(id,taskId,text,createdAt)
          VALUES('msg-1',${task.id},'Use the canary path',${new Date().toISOString()})`;
        const result = yield* work.execute({ task, taskAttempt });
        const delivered = yield* sql<{ deliveredAt: string | null }>`SELECT deliveredAt FROM task_operator_messages WHERE id='msg-1'`;
        return { result, delivered: delivered[0]!.deliveredAt };
      }).pipe(Effect.provide(layer)));
      expect(result.status).toBe("succeeded");
      const evidence = result.outputEvidence as {
        readonly stdout?: unknown;
        readonly rpcBytes?: unknown;
      };
      expect(String(evidence.stdout ?? "")).toContain("heard: Use the canary path");
      expect(Number(evidence.rpcBytes)).toBeGreaterThan(100_000);
      expect(JSON.stringify(evidence).length).toBeLessThan(10_000);
      expect(delivered).not.toBeNull();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

