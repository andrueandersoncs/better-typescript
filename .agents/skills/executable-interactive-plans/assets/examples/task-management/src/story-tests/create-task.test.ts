import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { CreateTaskInput } from "../domain/task"
import { createTask, listTasks, makeTaskService } from "../domain/task-service"

it.effect.prop("creates every valid generated task as incomplete", [CreateTaskInput], ([input]) =>
  Effect.gen(function* () {
    const layer = yield* makeTaskService([])
    const created = yield* createTask(input).pipe(Effect.provide(layer))
    const tasks = yield* listTasks.pipe(Effect.provide(layer))

    assert.strictEqual(created.title, input.title)
    assert.isFalse(created.completed)
    assert.deepStrictEqual(tasks, [created])
  }), { fastCheck: { numRuns: 25 } })
