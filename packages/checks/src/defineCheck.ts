import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import * as ts from "typescript"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { checkFromSubscriptions, fileCheck, nodeCheck } from "@better-typescript/core/engine/check"
import { loadRefactorExamplesAt } from "@better-typescript/core/engine/example"
import { namedCheck, silentCheck } from "@better-typescript/core/engine/wiring"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const packageExamplesRoot = path.resolve(moduleDirectory, "..", "examples")

export const packageExamples = (name: string): (() => NonEmptyRefactorExamples) => {
  const exampleRoot = path.join(packageExamplesRoot, name)
  const loadExamplesEffect = loadRefactorExamplesAt(exampleRoot)
  const cachedLoad = Effect.cached(loadExamplesEffect)
  const loadOnce = Effect.runSync(cachedLoad)
  const loadExamples = (): NonEmptyRefactorExamples => Effect.runSync(loadOnce)

  return loadExamples
}

export const defineCheck = <N extends ts.Node>(
  name: string,
  kinds: ReadonlyArray<ts.SyntaxKind>,
  refine: (node: ts.Node) => node is N,
  detect: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
): NamedCheck => {
  const withKinds = nodeCheck(kinds)
  const withRefine = withKinds(refine)
  const check = withRefine(detect)
  const examples = packageExamples(name)

  return namedCheck(name, check, examples)
}

export const defineFileCheck = (
  name: string,
  detect: (context: CheckContext) => ReadonlyArray<Detection>
): NamedCheck => {
  const check = fileCheck(detect)
  const examples = packageExamples(name)

  return namedCheck(name, check, examples)
}

export const definePlannedCheck = (
  name: string,
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
): NamedCheck => {
  const check = checkFromSubscriptions(plan)
  const examples = packageExamples(name)

  return namedCheck(name, check, examples)
}

export const defineSilentPlannedCheck = (
  name: string,
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
): NamedCheck => {
  const check = checkFromSubscriptions(plan)
  const examples = packageExamples(name)

  return silentCheck(name, check, examples)
}
