import { Array, Function, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import {
  combineAll,
  nodeSubscriptions
} from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { isExtendsClause, unwrapCallee } from "../support/tsNode.js"
import { HardwiredDependencyData } from "./data.js"

const constructorMessage =
  "Hardwired Dependency — constructing a collaborator inside this Module blocks an injectable seam."

const constructorHint =
  "Accept the collaborator at the interface (adapter at the seam) so tests can substitute a second adapter."

const constructorData = new HardwiredDependencyData({ kind: "constructor" })

const valueConstructorNames = HashSet.make(
  "Class",
  "TaggedClass",
  "TaggedError"
)

const valueConstructorNamespaces = HashSet.make("Schema", "Data")

const isInsideFunctionLike = (node: ts.Node): boolean =>
  pipe(
    Option.fromNullable(node.parent),
    Option.map(
      (parent) => ts.isFunctionLike(parent) || isInsideFunctionLike(parent)
    ),
    Option.getOrElse(Function.constant(false))
  )

const resolveSymbol =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol): ts.Symbol => {
    const isAlias = (symbol.getFlags() & ts.SymbolFlags.Alias) !== 0

    return isAlias ? checker.getAliasedSymbol(symbol) : symbol
  }

const isValueConstructorAccess = (
  access: ts.PropertyAccessExpression
): boolean => {
  const isKnownMember = HashSet.has(valueConstructorNames, access.name.text)
  const namespace = Option.liftPredicate(ts.isIdentifier)(access.expression)

  const isKnownNamespace = Option.exists(namespace, (identifier) =>
    HashSet.has(valueConstructorNamespaces, identifier.text)
  )

  const conditions = Array.make(isKnownMember, isKnownNamespace)

  return Array.every(conditions, Boolean)
}

const newExpressionElements = (context: CheckContext) => {
  const element = detection(context)
  const checker = context.checker

  const heritageIsValueConstructor = (
    type: ts.ExpressionWithTypeArguments
  ): boolean => {
    const expression = type.expression
    const unwrapped = unwrapCallee(expression)

    const accessMatch = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
      Option.exists(isValueConstructorAccess)
    )

    const emitBaseMatch =
      ts.isIdentifier(expression) && expression.text.endsWith("_base")

    const typeAtLocation = checker.getTypeAtLocation(expression)
    const symbol = typeAtLocation.aliasSymbol ?? typeAtLocation.getSymbol()

    const typeMatch = pipe(
      Option.fromNullable(symbol),
      Option.map(resolveSymbol(checker)),
      Option.exists((resolved) => {
        const name = resolved.getName()

        return HashSet.has(valueConstructorNames, name)
      })
    )

    const checks = Array.make(accessMatch, emitBaseMatch, typeMatch)

    return Array.some(checks, Boolean)
  }

  const classExtendsValueConstructor = (
    declaration: ts.ClassDeclaration
  ): boolean => {
    const clauses = declaration.heritageClauses ?? Array.empty()

    return pipe(
      Array.findFirst(clauses, isExtendsClause),
      Option.exists((clause) =>
        Array.some(clause.types, heritageIsValueConstructor)
      )
    )
  }

  const isValueConstructor = (node: ts.NewExpression): boolean =>
    pipe(
      checker.getSymbolAtLocation(node.expression),
      Option.fromNullable,
      Option.map(resolveSymbol(checker)),
      Option.map((symbol) => symbol.getDeclarations() ?? Array.empty()),
      Option.map((declarations) =>
        Array.filterMap(
          declarations,
          Option.liftPredicate(ts.isClassDeclaration)
        )
      ),
      Option.exists((declarations) =>
        Array.some(declarations, classExtendsValueConstructor)
      )
    )

  const handler = (node: ts.NewExpression): ReadonlyArray<Detection> => {
    const insideFunction = isInsideFunctionLike(node)
    const exempt = isValueConstructor(node)
    const detectConditions = Array.make(insideFunction, exempt === false)
    const shouldDetect = Array.every(detectConditions, Boolean)

    const reported = element({
      node,
      message: constructorMessage,
      hint: constructorHint,
      data: constructorData
    })

    return shouldDetect ? Array.of(reported) : Array.empty()
  }

  return handler
}

const newExpressionKinds = Array.of(ts.SyntaxKind.NewExpression)

const newExpressionListeners = nodeSubscriptions(newExpressionKinds)(
  ts.isNewExpression
)(newExpressionElements)

const listeners = Array.of(newExpressionListeners)

export const hardwiredDependencies: Check = combineAll(listeners)

export const hardwiredDependenciesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("hardwired-dependencies")
