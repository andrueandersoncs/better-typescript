import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { CreateTaskInput } from "../domain/task"
import { completeTask, createTask, listTasks, makeTaskService } from "../domain/task-service"

it.effect.prop("completes every generated incomplete task without removing it", [CreateTaskInput], ([input]) =>
  Effect.gen(function* () {
    const layer = yield* makeTaskService([])
    const created = yield* createTask(input).pipe(Effect.provide(layer))
    const completed = yield* completeTask({ id: created.id }).pipe(Effect.provide(layer))
    const tasks = yield* listTasks.pipe(Effect.provide(layer))

    assert.deepStrictEqual(completed, { ...created, completed: true })
    assert.deepStrictEqual(tasks, [completed])
  }), { fastCheck: { numRuns: 25 } })
