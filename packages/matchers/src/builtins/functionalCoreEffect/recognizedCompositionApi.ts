import { Array, Function, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { importedEffectApiAt } from "./importedEffectApiAt.js"
import { isManagedRuntimeMethodAccess } from "./managedRuntimeMethodAccess.js"
import { callIsPipeRuntimeHandoff } from "./effectRuntimeApis.js"
import { importedMemberAt } from "./importedMemberAt.js"

const compositionLayerNames = Array.make(
  "effect",
  "effectDiscard",
  "effectContext",
  "succeed",
  "provide",
  "provideMerge"
)

const compositionEffectNames = Array.make(
  "provide",
  "provideService",
  "provideServiceEffect",
  "provideContext",
  "runCallback",
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit",
  "runCallbackWith",
  "runForkWith",
  "runPromiseWith",
  "runPromiseExitWith",
  "runSyncWith",
  "runSyncExitWith"
)

const compositionRuntimeNames = Array.make(
  "runCallback",
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit",
  "runCallbackWith",
  "runForkWith",
  "runPromiseWith",
  "runPromiseExitWith",
  "runSyncWith",
  "runSyncExitWith"
)

const managedRuntimeMakeNames = Array.of("make")

export const callIsRecognizedCompositionApi = (
  checker: ts.TypeChecker,
  node: ts.CallExpression
) => {
  const layer = importedEffectApiAt(checker, node.expression, "Layer", compositionLayerNames)
  const effect = importedEffectApiAt(checker, node.expression, "Effect", compositionEffectNames)

  const managedRuntimeMake = importedEffectApiAt(
    checker,
    node.expression,
    "ManagedRuntime",
    managedRuntimeMakeNames
  )

  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(node.expression)

  const isManagedRuntimeMethod = (expression: ts.PropertyAccessExpression) =>
    isManagedRuntimeMethodAccess(checker, expression, compositionRuntimeNames)

  const managedRuntimeMethod = Option.exists(propertyAccess, isManagedRuntimeMethod)
  const pipeRuntimeHandoff = callIsPipeRuntimeHandoff(checker, node, compositionRuntimeNames)

  const runMain = pipe(
    importedMemberAt(checker, node.expression),
    Option.exists((member) => {
      const lastOption = Array.last(member.path)
      const name = pipe(lastOption, Option.getOrElse(Function.constant("")))
      const platformNode = member.moduleSpecifier.startsWith("@effect/platform-node")
      const platformBun = member.moduleSpecifier.startsWith("@effect/platform-bun")
      const platformDeno = member.moduleSpecifier.startsWith("@effect/platform-deno")
      const platformBrowser = member.moduleSpecifier.startsWith("@effect/platform-browser")
      const platformFlags = Array.make(platformNode, platformBun, platformDeno, platformBrowser)
      const platformRuntime = Array.some(platformFlags, Boolean)
      const isRunMain = strictEqual("runMain")(name)
      const runMainFlags = Array.make(platformRuntime, isRunMain)

      return Array.every(runMainFlags, Boolean)
    })
  )

  const checks = Array.make(
    layer,
    effect,
    managedRuntimeMake,
    managedRuntimeMethod,
    pipeRuntimeHandoff,
    runMain
  )

  return Array.some(checks, Boolean)
}
