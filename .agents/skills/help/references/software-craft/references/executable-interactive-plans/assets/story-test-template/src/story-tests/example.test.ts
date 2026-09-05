import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { ExampleInput, makeExampleService, runExample } from "../domain/example"

it.effect.prop("greets every generated name", [ExampleInput], ([input]) =>
  Effect.gen(function* () {
    const result = yield* runExample(input).pipe(Effect.provide(makeExampleService))
    assert.strictEqual(result, `Hello, ${input.name}`)
  }), { fastCheck: { numRuns: 25 } })
