import { Array, Function, Match, Option, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { foldAst } from "@better-typescript/matchers/sources"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import { importedMemberAt, importedMemberSubject } from "./importedMembers.js"
import { importedEffectApiAt } from "./effectApiMembers.js"
import {
  declarationNameNode,
  enclosingFunctionLike,
  isRuntimeFunctionLike
} from "./functionScope.js"

const suspensionNames = Array.make("callback", "promise", "suspend", "sync", "try", "tryPromise")

const effectLifecycleNames = Array.make(
  "acquireRelease",
  "acquireUseRelease",
  "acquireDisposable",
  "addFinalizer"
)

const tryEffectNames = Array.make("try", "tryPromise")

const isSuspensionCallbackDeclaration = (
  checker: ts.TypeChecker,
  declaration: ts.FunctionLikeDeclaration
) => {
  const parent = declaration.parent

  if (ts.isCallExpression(parent)) {
    const argumentIsDeclaration = strictEqual(declaration)
    const isArgument = Array.some(parent.arguments, argumentIsDeclaration)
    const isSuspension = importedEffectApiAt(checker, parent.expression, "Effect", suspensionNames)

    return isArgument && isSuspension
  }

  const importedEffectApiAtOf3 = (call: ts.CallExpression) =>
    importedEffectApiAt(checker, call.expression, "Effect", tryEffectNames)

  const textIsTry = strictEqual("try")

  const pipeOf7 = (assignment: ts.PropertyAssignment) =>
    pipe(
      Match.value(assignment.name),
      Match.when(ts.isIdentifier, Struct.get<ts.Identifier, "text">("text")),
      Match.when(ts.isStringLiteralLike, Struct.get<ts.StringLiteralLike, "text">("text")),
      Match.orElse(Function.constant("")),
      Option.liftPredicate(textIsTry),
      Option.map(() => assignment.parent),
      Option.filter(ts.isObjectLiteralExpression),
      Option.map(Struct.get("parent")),
      Option.filter(ts.isCallExpression),
      Option.map(importedEffectApiAtOf3)
    )

  const assignmentInitializesDeclaration = flow(
    Struct.get<ts.PropertyAssignment, "initializer">("initializer"),
    strictEqual(declaration)
  )

  return pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(parent),
    Option.filter(assignmentInitializesDeclaration),
    Option.flatMap(pipeOf7),
    Option.getOrElse(Function.constFalse)
  )
}

export const hasSuspensionBoundary = (checker: ts.TypeChecker, node: ts.Node) => {
  const visit = (current: ts.Node): boolean => {
    const isSuspensionCallback =
      isRuntimeFunctionLike(current) && isSuspensionCallbackDeclaration(checker, current)

    return isSuspensionCallback
      ? true
      : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return visit(node)
}

export const hasEffectCallAncestor = (
  checker: ts.TypeChecker,
  node: ts.Node,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const visit = (current: ts.Node): boolean => {
    const matchingCall =
      ts.isCallExpression(current) &&
      importedEffectApiAt(checker, current.expression, namespace, names)

    return matchingCall ? true : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return visit(node)
}

const externalImportedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    importedMemberAt(checker, expression),
    Option.filter((member) => {
      const relative = member.moduleSpecifier.startsWith(".")
      const absolute = member.moduleSpecifier.startsWith("/")
      const notRelative = !relative
      const notAbsolute = !absolute
      const externalFlags = Array.make(notRelative, notAbsolute)

      return Array.every(externalFlags, Boolean)
    })
  )

export const resourceSubjectAt = (
  context: MatchContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.CallExpression | ts.NewExpression
) =>
  pipe(
    externalImportedMemberAt(context.checker, node.expression),
    Option.filter((member) => {
      const lastOption = Array.last(member.path)
      const name = pipe(lastOption, Option.getOrElse(Function.constant("")))
      const factoryMatch = Array.contains(policy.resourceFactoryNames, name)
      const suffixMatch = Array.some(policy.resourceTypeSuffixes, (suffix) => name.endsWith(suffix))
      const isNewExpression = ts.isNewExpression(node)
      const newSuffixMatch = isNewExpression && suffixMatch

      return factoryMatch || newSuffixMatch
    }),
    Option.map(importedMemberSubject)
  )

export const hasScopedLifecycleAncestor = (checker: ts.TypeChecker, node: ts.Node) => {
  const scopedEffect = hasEffectCallAncestor(checker, node, "Effect", effectLifecycleNames)
  const hasSuspension = hasSuspensionBoundary(checker, node)
  const scopedFlags = Array.make(scopedEffect, hasSuspension)

  return Array.every(scopedFlags, Boolean)
}

export const hasSourceFileScope = (context: MatchContext, node: ts.Node) => {
  const childReferencesScopedSymbol = (scopedSymbol: ts.Symbol) => (current: ts.Node) => {
    const reduceReferencedChild = (referenced: boolean, child: ts.Node) => {
      const isIdentifier = ts.isIdentifier(child)
      const notIdentifier = !isIdentifier
      const skipChild = referenced || notIdentifier

      if (skipChild) {
        return referenced
      }

      const symbol = context.checker.getSymbolAtLocation(child)

      return strictEqual(scopedSymbol)(symbol)
    }

    return foldAst(reduceReferencedChild)(current)(false)
  }

  const foldAstOf = (scopedSymbol: ts.Symbol) => {
    const childReferencesScope = childReferencesScopedSymbol(scopedSymbol)

    const reduceScopedCall = (found: boolean, current: ts.Node) => {
      const isCall = ts.isCallExpression(current)
      const notCall = !isCall
      const skipNode = found || notCall

      if (skipNode) {
        return found
      }

      const isScoped = importedEffectApiAt(
        context.checker,
        current.expression,
        "Effect",
        effectLifecycleNames
      )

      return isScoped ? childReferencesScope(current) : found
    }

    return foldAst(reduceScopedCall)(context.sourceFile)(false)
  }

  return pipe(
    enclosingFunctionLike(node),
    Option.flatMap(declarationNameNode),
    Option.flatMap(
      flow((name: ts.Identifier) => context.checker.getSymbolAtLocation(name), Option.fromNullishOr)
    ),
    Option.exists(foldAstOf)
  )
}
