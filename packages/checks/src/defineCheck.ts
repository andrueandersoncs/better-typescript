import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, HashMap, Option, Ref } from "effect"
import * as ts from "typescript"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import {
  checkFromSubscriptions,
  fileCheck,
  nodeCheck,
  withCompilerOptions
} from "@better-typescript/core/engine/check"
import { loadRefactorExamplesAt } from "@better-typescript/core/engine/example"
import { namedCheck, silentCheck } from "@better-typescript/core/engine/wiring"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const packageExamplesRoot = path.resolve(moduleDirectory, "..", "examples")

// Examples memoize per check name because each check should read its example tree at most once.
const emptyExamplesCache = HashMap.empty<string, NonEmptyRefactorExamples>()
const loadedExamples = Ref.makeUnsafe(emptyExamplesCache)

export const packageExamples = (name: string): (() => NonEmptyRefactorExamples) => {
  const exampleRoot = path.join(packageExamplesRoot, name)
  const loadEffect = loadRefactorExamplesAt(exampleRoot)

  const loadAndCache = Effect.gen(function* () {
    const loaded = yield* loadEffect

    yield* Ref.update(loadedExamples, HashMap.set(name, loaded))

    return loaded
  })

  const readOrLoad = Effect.gen(function* () {
    const cache = yield* Ref.get(loadedExamples)
    const cached = HashMap.get(cache, name)

    if (Option.isSome(cached)) {
      return cached.value
    }

    return yield* loadAndCache
  })

  const loadExamples = (): NonEmptyRefactorExamples => Effect.runSync(readOrLoad)

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
  detect: (context: CheckContext) => ReadonlyArray<Detection>,
  compilerOptions: ts.CompilerOptions = {}
): NamedCheck => {
  const detected = fileCheck(detect)
  const check = withCompilerOptions(compilerOptions)(detected)
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
