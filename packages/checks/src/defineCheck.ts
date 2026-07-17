import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import * as ts from "typescript"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { checkFromSubscriptions, fileCheck, nodeCheck } from "@better-typescript/core/engine/check"
import { loadRefactorExamplesAt } from "@better-typescript/core/engine/example"
import { namedCheck, silentCheck } from "@better-typescript/core/engine/wiring"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const packageExamplesRoot = path.resolve(moduleDirectory, "..", "examples")

export const packageExamples = Effect.fn("packageExamples")(function* (name: string) {
  const exampleRoot = path.join(packageExamplesRoot, name)

  return yield* loadRefactorExamplesAt(exampleRoot)
})

export const defineCheck = Effect.fn("defineCheck")(function* <N extends ts.Node>(
  name: string,
  kinds: ReadonlyArray<ts.SyntaxKind>,
  refine: (node: ts.Node) => node is N,
  detect: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
) {
  const withKinds = nodeCheck(kinds)
  const withRefine = withKinds(refine)
  const check = withRefine(detect)
  const examples = yield* packageExamples(name)

  return namedCheck(name, check, examples)
})

export const defineFileCheck = Effect.fn("defineFileCheck")(function* (
  name: string,
  detect: (context: CheckContext) => ReadonlyArray<Detection>
) {
  const check = fileCheck(detect)
  const examples = yield* packageExamples(name)

  return namedCheck(name, check, examples)
})

export const definePlannedCheck = Effect.fn("definePlannedCheck")(function* (
  name: string,
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
) {
  const check = checkFromSubscriptions(plan)
  const examples = yield* packageExamples(name)

  return namedCheck(name, check, examples)
})

export const defineSilentPlannedCheck = Effect.fn("defineSilentPlannedCheck")(function* (
  name: string,
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
) {
  const check = checkFromSubscriptions(plan)
  const examples = yield* packageExamples(name)

  return silentCheck(name, check, examples)
})
