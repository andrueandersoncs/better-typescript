import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"
import { Function, flow } from "effect"
import type { Check, CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { RefactorExampleSource } from "@better-typescript/core/engine/example/data"
import { directoryRefactorExamples } from "@better-typescript/core/engine/example"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { checkFromSubscriptions, fileCheck, nodeCheck } from "@better-typescript/core/engine/check"
import { namedCheck, silentCheck } from "@better-typescript/core/engine/wiring"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const packageExamplesRoot = path.resolve(moduleDirectory, "..", "examples")

const exampleRootFor = (name: string): string => path.join(packageExamplesRoot, name)

// packageExamples stays an inert directory descriptor because loading belongs to report rendering.
export const packageExamples: (name: string) => RefactorExampleSource = Function.compose(
  exampleRootFor,
  directoryRefactorExamples
)

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): Check =>
    checkFromSubscriptions(flow(build, subscriptions))

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
