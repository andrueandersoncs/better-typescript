import { Effect } from "effect";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { persistenceLayer } from "../../src/layers";
import { TaskModel } from "../../src/task-model";

const dataDirectory = resolve(required("DATA_DIRECTORY"));
const databasePath = join(dataDirectory, "task-based-pi.sqlite");
await mkdir(dataDirectory, { recursive: true });

await Effect.runPromise(Effect.gen(function*() {
  const model = yield* TaskModel;
  const task = yield* model.createTask({
    parentId: null,
    title: "Automatic retry fixture",
    description: "Write the isolated execution marker.",
    verification: {
      kind: "command",
      command: "grep -q 'task-based-pi isolated execution' README.md",
    },
  });
  const manual = yield* model.createTrigger({
    targetTaskId: task.id,
    condition: { kind: "manual" },
  });
  const retry = yield* model.createTrigger({
    targetTaskId: task.id,
    condition: { kind: "task-outcome", sourceTaskId: task.id, outcome: "failed" },
    maxFiringsPerCausalChain: 2,
  });
  const first = yield* model.admitTrigger({
    triggerId: manual.id,
    occurrenceKey: "seed:initial",
  });
  if (first.attempt === null) throw new Error("Initial TaskAttempt was not admitted");
  yield* model.startAttempt(first.attempt.id);
  const failed = yield* model.finishAttempt({
    attemptId: first.attempt.id,
    status: "failed",
    outputEvidence: { stderr: "Seeded execution failure" },
  });
  yield* model.admitTrigger({
    triggerId: retry.id,
    occurrenceKey: failed.settlement.occurrenceKey,
    causedByAttemptId: failed.settlement.causedByAttemptId,
  });
}).pipe(Effect.provide(persistenceLayer(databasePath))));

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
