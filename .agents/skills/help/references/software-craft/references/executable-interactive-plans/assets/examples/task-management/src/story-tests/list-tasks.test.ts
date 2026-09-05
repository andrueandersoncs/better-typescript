import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { Tasks } from "../domain/task"
import { listTasks, makeTaskService } from "../domain/task-service"

it.effect.prop("lists every generated fixture in its stored order", [Tasks], ([fixture]) =>
  Effect.gen(function* () {
    const layer = yield* makeTaskService(fixture)
    const tasks = yield* listTasks.pipe(Effect.provide(layer))

    assert.deepStrictEqual(tasks, fixture)
  }), { fastCheck: { numRuns: 25 } })
