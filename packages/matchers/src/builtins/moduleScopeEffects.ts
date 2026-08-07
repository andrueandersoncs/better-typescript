import { Array, Function, HashSet, Option, Struct, flow, pipe, Match as EffectMatch } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { isCompositionRoot } from "../support/compositionRoot.js"
import { isTestSourceFile } from "./architectureExplore/isTestPath.js"
import { symbolDeclaredInEffectPackage } from "../support/declarationInEffectPackage.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match as MatcherMatch } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { rawSymbolAt } from "../support/rawSymbolAt.js"
import { rootIdentifier } from "./rootIdentifier.js"
import { importedModuleSpecifier } from "./importedModuleSpecifier.js"
import { ModuleScopeEffectData } from "./moduleScopeEffectData.js"

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

const isFunctionLikeAncestorKind = (kind: ts.SyntaxKind) =>
  HashSet.has(functionLikeAncestorKinds, kind)

const isScopeContainerAncestorKind = (kind: ts.SyntaxKind) =>
  HashSet.has(scopeContainerAncestorKinds, kind)

const isEffectfulBuiltinModule = (specifier: string) =>
  HashSet.has(effectfulBuiltinModules, specifier)

const isEffectRunMethodAccess = (access: ts.PropertyAccessExpression) =>
  HashSet.has(effectRunMethodNames, access.name.text)

const isModuleScopeCall = (current: ts.Node): boolean =>
  pipe(
    Option.fromNullishOr(current.parent),
    Option.match({
      onNone: Function.constFalse,
      onSome: (ancestor) =>
        pipe(
          EffectMatch.value(ancestor.kind),
          EffectMatch.when(isFunctionLikeAncestorKind, Function.constFalse),
          EffectMatch.when(isScopeContainerAncestorKind, Function.constFalse),
          EffectMatch.when(ts.SyntaxKind.SourceFile, () => {
            const expressionStatement = ts.isExpressionStatement(current)
            const variableStatement = ts.isVariableStatement(current)
            const moduleScopeStatements = Array.make(expressionStatement, variableStatement)

            return Array.some(moduleScopeStatements, Boolean)
          }),
          EffectMatch.orElse(() => isModuleScopeCall(ancestor))
        )
    })
  )

const isTsSysRooted = (expression: ts.Expression): boolean =>
  pipe(
    expression,
    unwrapTransparentExpression,
    EffectMatch.value,
    EffectMatch.when(ts.isPropertyAccessExpression, (access) => {
      const receiver = unwrapTransparentExpression(access.expression)
      const receiverIdentifier = Option.liftPredicate(ts.isIdentifier)(receiver)
      const identifierTextIsTs = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("ts"))
      const receiverIsTs = Option.exists(receiverIdentifier, identifierTextIsTs)
      const memberIsSys = strictEqual("sys")(access.name.text)
      const rootChecks = Array.make(receiverIsTs, memberIsSys)
      const rootedHere = Array.every(rootChecks, Boolean)

      return pipe(
        EffectMatch.value(rootedHere),
        EffectMatch.when(true, Function.constTrue),
        EffectMatch.orElse(() => isTsSysRooted(access.expression))
      )
    }),
    EffectMatch.orElse(Function.constFalse)
  )

const isProcessMemberCall = (call: ts.CallExpression) => {
  const identifierTextIsProcess = flow(
    Struct.get<ts.Identifier, "text">("text"),
    strictEqual("process")
  )

  return pipe(
    call.expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.flatMap(rootIdentifier),
    Option.exists(identifierTextIsProcess)
  )
}

const isBuiltinEffectfulCall = (checker: ts.TypeChecker, call: ts.CallExpression) => {
  const fromBuiltinImport = pipe(
    importedModuleSpecifier(checker, call.expression),
    Option.exists(isEffectfulBuiltinModule)
  )

  const processCall = isProcessMemberCall(call)
  const tsSysCall = isTsSysRooted(call.expression)
  const candidates = Array.make(fromBuiltinImport, processCall, tsSysCall)

  return Array.some(candidates, Boolean)
}

const effectPackageRootSymbol = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(rootIdentifier(expression), Option.flatMap(rawSymbolAt(checker)))

const isEffectPackageSpecifier = (specifier: string) => {
  const exactPackage = strictEqual("effect")(specifier)
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

const effectPackageCalleeFromAccess =
  (checker: ts.TypeChecker) => (access: ts.PropertyAccessExpression) =>
    isEffectPackageCalleeRoot(checker, access.expression)

const isEffectRunCall = (checker: ts.TypeChecker, call: ts.CallExpression) =>
  pipe(
    call.expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.filter(isEffectRunMethodAccess),
    Option.exists(effectPackageCalleeFromAccess(checker))
  )

const classifiedModuleScopeEffectKind =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ModuleScopeEffectData["kind"]> => {
    const matchesEffectRunCall = (candidate: ts.CallExpression) =>
      isEffectRunCall(checker, candidate)

    const matchesBuiltinEffectfulCall = (candidate: ts.CallExpression) =>
      isBuiltinEffectfulCall(checker, candidate)

    const effectRunKind = pipe(
      Option.some(call),
      Option.filter(matchesEffectRunCall),
      Option.as<ModuleScopeEffectData["kind"]>("effect-run")
    )

    const moduleScopeIoKind = (): Option.Option<ModuleScopeEffectData["kind"]> =>
      pipe(
        Option.some(call),
        Option.filter(isModuleScopeCall),
        Option.filter(matchesBuiltinEffectfulCall),
        Option.as<ModuleScopeEffectData["kind"]>("module-scope-io")
      )

    return pipe(effectRunKind, Option.orElse(moduleScopeIoKind))
  }

const moduleScopeEffectElements = (context: MatchContext) => {
  const testSource = isTestSourceFile(context.workspaceRoot)
  const classifyEffectKind = classifiedModuleScopeEffectKind(context.checker)

  const handler = (node: ts.CallExpression): ReadonlyArray<MatcherMatch<ModuleScopeEffectData>> => {
    const fromTest = testSource(context.sourceFile)
    const atCompositionRoot = isCompositionRoot(context.sourceFile)
    const ignoreConditions = Array.make(fromTest, atCompositionRoot)
    const shouldIgnore = Array.some(ignoreConditions, Boolean)

    if (shouldIgnore) {
      return Array.empty()
    }

    const detectionForKind = (kind: ModuleScopeEffectData["kind"]) => {
      const calleeText = node.expression.getText(context.sourceFile)
      const data = ModuleScopeEffectData.make({ calleeText, kind })

      return makeNodeMatch(node, data)
    }

    return pipe(classifyEffectKind(node), Option.map(detectionForKind), Option.toArray)
  }

  return handler
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

export const moduleScopeEffects = nodeMatcher(callExpressionKinds)(ts.isCallExpression)(
  moduleScopeEffectElements
)
