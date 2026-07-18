import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"
import { Function, flow } from "effect"
import type { Check, CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { RefactorExampleSource } from "@better-typescript/core/engine/example/data"
import { makeDirectoryRefactorExamples } from "@better-typescript/core/engine/example"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import {
  makeCheckFromSubscriptions,
  fileCheck,
  nodeCheck,
  withCompilerOptions
} from "@better-typescript/core/engine/check"
import {
  makeNamedCheck,
  makeSilentCheck as makeSilentNamedCheck
} from "@better-typescript/core/engine/wiring"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const packageExamplesRoot = path.resolve(moduleDirectory, "..", "examples")

const exampleRootFor = (name: string) => path.join(packageExamplesRoot, name)

// packageExamples stays an inert directory descriptor because loading belongs to report rendering.
export const packageExamples: (name: string) => RefactorExampleSource = Function.compose(
  exampleRootFor,
  makeDirectoryRefactorExamples
)

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): Check =>
    makeCheckFromSubscriptions(flow(build, subscriptions))

export const makeSilentCheck = (name: string, check: Check) => makeSilentNamedCheck(name, check)

export const makeCheck = <N extends ts.Node>(
  name: string,
  kinds: ReadonlyArray<ts.SyntaxKind>,
  refine: (node: ts.Node) => node is N,
  detect: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
): NamedCheck => {
  const withKinds = nodeCheck(kinds)
  const withRefine = withKinds(refine)
  const check = withRefine(detect)
  const examples = packageExamples(name)

  return makeNamedCheck(name, check, examples)
}

export const makeFileCheck = (
  name: string,
  detect: (context: CheckContext) => ReadonlyArray<Detection>,
  compilerOptions: ts.CompilerOptions = {}
) => {
  const detected = fileCheck(detect)
  const check = withCompilerOptions(compilerOptions)(detected)
  const examples = packageExamples(name)

  return makeNamedCheck(name, check, examples)
}

export const makePlannedCheck = (
  name: string,
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
) => {
  const check = makeCheckFromSubscriptions(plan)
  const examples = packageExamples(name)

  return makeNamedCheck(name, check, examples)
}

export const makeSilentPlannedCheck = (
  name: string,
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
) => {
  const check = makeCheckFromSubscriptions(plan)
  const examples = packageExamples(name)

  return makeSilentNamedCheck(name, check, examples)
}
