import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { CompleteTaskInput, TaskNotFound } from "../domain/task"
import { completeTask, makeTaskService } from "../domain/task-service"

it.effect.prop("fails for every generated missing task id", [CompleteTaskInput], ([input]) =>
  Effect.gen(function* () {
    const layer = yield* makeTaskService([])
    const error = yield* completeTask(input).pipe(Effect.provide(layer), Effect.flip)
    assert.instanceOf(error, TaskNotFound)
    assert.strictEqual(error.id, input.id)
  }), { fastCheck: { numRuns: 25 } })
