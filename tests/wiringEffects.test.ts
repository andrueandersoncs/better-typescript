import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Effect } from "effect"
import type { Advice } from "@better-typescript/core/engine/derive/advice"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { makeMergedWiring } from "@better-typescript/core/engine/wiring/makeMergedWiring"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import type { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import type { WiringError } from "@better-typescript/core/engine/wiring/wiringError"
import type { WiringConfig } from "@better-typescript/core/engine/wiring/wiringConfig"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { initialSource } from "./watchInitialSource.js"
import { syntheticUpdate } from "./watchSyntheticContext.js"
import type { TypeEqual } from "./wiringEffectsTypeEqual.js"

test("reportEvents propagates fallible wiring derivation", async () => {
  const derivationError = new Error("derivation failed")
  const wiring = makeWiring({
    policies: [],
    derive: () => Effect.fail(derivationError)
  })
  const typedWiring: Wiring<Error> = wiring
  const config = defineConfig([{ files: ["**/*"], wiring }])
  const typedConfig: WiringConfig<Error> = config
  const wiringErrorIsPreserved: TypeEqual<WiringError<typeof wiring>, Error> = true
  const configErrorIsPreserved: TypeEqual<
    WiringError<(typeof config)[number]["wiring"]>,
    Error
  > = true

  void typedWiring
  void typedConfig
  void wiringErrorIsPreserved
  void configErrorIsPreserved

  await assert.rejects(
    Effect.runPromise(reportEvents(config)(syntheticUpdate(initialSource))),
    (error) => error === derivationError
  )
})

test("makeMergedWiring executes each effect once and preserves wiring advice order", async () => {
  const executions: Array<string> = []
  const firstAdvice = { title: "first" } as Advice
  const secondAdvice = { title: "second" } as Advice
  const first = makeWiring({
    policies: [],
    derive: () =>
      Effect.sync(() => {
        executions.push("first")
        return [firstAdvice]
      })
  })
  const second = makeWiring({
    policies: [],
    derive: () =>
      Effect.sync(() => {
        executions.push("second")
        return [secondAdvice]
      })
  })

  const inferredMerged = makeMergedWiring([first, second])
  const merged: Wiring<never> = inferredMerged
  const mergedErrorIsPreserved: TypeEqual<WiringError<typeof inferredMerged>, never> = true
  const advice = await Effect.runPromise(merged.derive([]))

  void mergedErrorIsPreserved
  assert.deepEqual(executions, ["first", "second"])
  assert.deepEqual(advice, [firstAdvice, secondAdvice])
})

test("makeMergedWiring preserves heterogeneous errors and short-circuits failures", async () => {
  const executions: Array<string> = []
  const first = makeWiring({
    policies: [],
    derive: () =>
      Effect.sync(() => {
        executions.push("first")
      }).pipe(Effect.flatMap(() => Effect.fail("first failure" as const)))
  })
  const second = makeWiring({
    policies: [],
    derive: () =>
      Effect.sync(() => {
        executions.push("second")
      }).pipe(Effect.flatMap(() => Effect.fail("second failure" as const)))
  })
  const wirings = [first, second] as const
  const merged = makeMergedWiring(wirings)
  const config = defineConfig([
    { files: ["src/**/*.ts"], wiring: first },
    { files: ["tests/**/*.ts"], wiring: second }
  ] as const)
  const mergedErrorIsPreserved: TypeEqual<
    WiringError<typeof merged>,
    "first failure" | "second failure"
  > = true
  const configErrorIsPreserved: TypeEqual<
    WiringError<(typeof config)[number]["wiring"]>,
    "first failure" | "second failure"
  > = true

  const error = await Effect.runPromise(Effect.flip(merged.derive([])))

  void mergedErrorIsPreserved
  void configErrorIsPreserved
  assert.equal(error, "first failure")
  assert.deepEqual(executions, ["first"])
})

test("empty merged wiring and config infer never", async () => {
  const merged = makeMergedWiring([] as const)
  const config = defineConfig([] as const)
  const mergedErrorIsNever: TypeEqual<WiringError<typeof merged>, never> = true
  const configErrorIsNever: TypeEqual<WiringError<(typeof config)[number]["wiring"]>, never> = true
  const advice = await Effect.runPromise(merged.derive([]))

  void mergedErrorIsNever
  void configErrorIsNever
  assert.deepEqual(advice, [])
})
