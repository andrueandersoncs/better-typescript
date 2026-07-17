import { Array, Function, HashSet, Match, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"

import { ModuleScopeEffectData } from "./data.js"
import { importDeclarationAncestor } from "./externalDependencyConstruction.js"
import { isCompositionRoot } from "../support/compositionRoot.js"
import { isTestSourceFile } from "./programSymbols.js"
import { symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { defineSilentCheck } from "../../defineCheck.js"
import { moduleScopeEffectsName } from "./names.js"

const message =
  "Module-scope effect evidence — this call runs effectful work outside an injectable seam."

const hint =
  "Architecture Explore classifies concentrated evidence before recommending a real seam with production and test adapters."

const effectfulBuiltinModules = HashSet.make(
  "node:fs",
  "fs",
  "node:child_process",
  "child_process",
  "node:process",
  "node:net",
  "node:http",
  "node:https",
  "node:os"
)

const effectRunMethodNames = HashSet.make(
  "runSync",
  "runPromise",
  "runFork",
  "runSyncExit",
  "runPromiseExit"
)

const functionLikeAncestorKinds = HashSet.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

const scopeContainerAncestorKinds = HashSet.make(
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ModuleDeclaration
)

const isModuleScopeCall = (current: ts.Node): boolean =>
  pipe(
    Option.fromNullishOr(current.parent),
    Option.match({
      onNone: Function.constFalse,
      onSome: (ancestor) =>
        pipe(
          Match.value(ancestor.kind),
          Match.when((kind) => HashSet.has(functionLikeAncestorKinds, kind), Function.constFalse),
          Match.when((kind) => HashSet.has(scopeContainerAncestorKinds, kind), Function.constFalse),
          Match.when(ts.SyntaxKind.SourceFile, () => {
            const expressionStatement = ts.isExpressionStatement(current)
            const variableStatement = ts.isVariableStatement(current)
            const moduleScopeStatements = Array.make(expressionStatement, variableStatement)

            return Array.some(moduleScopeStatements, Boolean)
          }),
          Match.orElse(() => isModuleScopeCall(ancestor))
        )
    })
  )

const rootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> => {
  const unwrapped = unwrapTransparentExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  const propertyRoot = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.flatMap((access) => rootIdentifier(access.expression))
  )

  const elementRoot = pipe(
    Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
    Option.flatMap((access) => rootIdentifier(access.expression))
  )

  const callRoot = pipe(
    Option.liftPredicate(ts.isCallExpression)(unwrapped),
    Option.flatMap((call) => rootIdentifier(call.expression))
  )

  return pipe(
    identifier,
    Option.orElse(Function.constant(propertyRoot)),
    Option.orElse(Function.constant(elementRoot)),
    Option.orElse(Function.constant(callRoot))
  )
}

const hasImportDeclarationAncestor = Function.compose(importDeclarationAncestor, Option.isSome)

const importedModuleSpecifier = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    rootIdentifier(expression),
    Option.flatMap((identifier) =>
      pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)
    ),
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.flatMap(Array.findFirst(hasImportDeclarationAncestor)),
    Option.flatMap(importDeclarationAncestor),
    Option.map(Struct.get("moduleSpecifier")),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

const isTsSysRooted = (expression: ts.Expression): boolean =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const receiver = unwrapTransparentExpression(access.expression)
      const receiverIdentifier = Option.liftPredicate(ts.isIdentifier)(receiver)

      const receiverIsTs = Option.exists(
        receiverIdentifier,
        (identifier) => identifier.text === "ts"
      )

      const memberIsSys = access.name.text === "sys"
      const rootChecks = Array.make(receiverIsTs, memberIsSys)
      const rootedHere = Array.every(rootChecks, Boolean)

      return pipe(
        Match.value(rootedHere),
        Match.when(true, Function.constTrue),
        Match.orElse(() => isTsSysRooted(access.expression))
      )
    }),
    Match.orElse(Function.constFalse)
  )

const isProcessMemberCall = (call: ts.CallExpression) =>
  pipe(
    call.expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.flatMap(rootIdentifier),
    Option.exists((identifier) => identifier.text === "process")
  )

const isBuiltinEffectfulCall = (checker: ts.TypeChecker, call: ts.CallExpression) => {
  const fromBuiltinImport = pipe(
    importedModuleSpecifier(checker, call.expression),
    Option.exists((specifier) => HashSet.has(effectfulBuiltinModules, specifier))
  )

  const processCall = isProcessMemberCall(call)
  const tsSysCall = isTsSysRooted(call.expression)
  const candidates = Array.make(fromBuiltinImport, processCall, tsSysCall)

  return Array.some(candidates, Boolean)
}

const effectPackageRootSymbol = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    rootIdentifier(expression),
    Option.flatMap((identifier) =>
      pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)
    )
  )

const isEffectPackageSpecifier = (specifier: string) => {
  const exactPackage = specifier === "effect"
  const packageSubpath = specifier.startsWith("effect/")
  const candidates = Array.make(exactPackage, packageSubpath)

  return Array.some(candidates, Boolean)
}

const isEffectPackageCalleeRoot = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const declaredInEffect = pipe(
    effectPackageRootSymbol(checker, expression),
    Option.exists(symbolDeclaredInEffectPackage)
  )

  const importedFromEffect = pipe(
    importedModuleSpecifier(checker, expression),
    Option.exists(isEffectPackageSpecifier)
  )

  const candidates = Array.make(declaredInEffect, importedFromEffect)

  return Array.some(candidates, Boolean)
}

const isEffectRunCall = (checker: ts.TypeChecker, call: ts.CallExpression) =>
  pipe(
    call.expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.filter((access) => HashSet.has(effectRunMethodNames, access.name.text)),
    Option.exists((access) => isEffectPackageCalleeRoot(checker, access.expression))
  )

const classifiedModuleScopeEffectKind =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ModuleScopeEffectData["kind"]> => {
    const effectRunKind = pipe(
      Option.some(call),
      Option.filter((candidate) => isEffectRunCall(checker, candidate)),
      Option.as<ModuleScopeEffectData["kind"]>("effect-run")
    )

    const moduleScopeIoKind = (): Option.Option<ModuleScopeEffectData["kind"]> =>
      pipe(
        Option.some(call),
        Option.filter(isModuleScopeCall),
        Option.filter((candidate) => isBuiltinEffectfulCall(checker, candidate)),
        Option.as<ModuleScopeEffectData["kind"]>("module-scope-io")
      )

    return pipe(effectRunKind, Option.orElse(moduleScopeIoKind))
  }

const moduleScopeEffectElements = (context: CheckContext) => {
  const element = detection(context)
  const testSource = isTestSourceFile(context.workspaceRoot)
  const classifyEffectKind = classifiedModuleScopeEffectKind(context.checker)

  const handler = (node: ts.CallExpression): ReadonlyArray<Detection> => {
    const fromTest = testSource(context.sourceFile)
    const atCompositionRoot = isCompositionRoot(context.sourceFile)
    const ignoreConditions = Array.make(fromTest, atCompositionRoot)
    const shouldIgnore = Array.some(ignoreConditions, Boolean)

    if (shouldIgnore) {
      return Array.empty()
    }

    return pipe(
      classifyEffectKind(node),
      Option.map((kind) => {
        const calleeText = node.expression.getText(context.sourceFile)
        const data = new ModuleScopeEffectData({ calleeText, kind })
        const reported = element({ node, message, hint, data })

        return reported
      }),
      Option.toArray
    )
  }

  return handler
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const moduleScopeEffectCheck = nodeCheck(callExpressionKinds)(ts.isCallExpression)(
  moduleScopeEffectElements
)

export const moduleScopeEffects = defineSilentCheck(moduleScopeEffectsName, moduleScopeEffectCheck)
