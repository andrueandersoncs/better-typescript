import { Option, Struct, Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isExtendsClause, namedDetectionTarget } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
const hasTaggedClassName = (name: ts.MemberName): boolean =>
  name.text === "TaggedClass"

const isTaggedClassProperty = (expression: ts.Expression): boolean =>
  ts.isPropertyAccessExpression(expression) &&
  hasTaggedClassName(expression.name)

const accessExpression = Struct.get("expression")

const callExpression = Struct.get("expression")

const isDataIdentifier = (id: ts.Identifier): boolean => id.text === "Data"

const isDataTaggedCallee = (callee: ts.PropertyAccessExpression): boolean => {
  const object = accessExpression(callee)
  const hasTaggedClass = hasTaggedClassName(callee.name)
  const identifierOption = Option.liftPredicate(ts.isIdentifier)(object)
  const isOnData = Option.exists(identifierOption, isDataIdentifier)

  return hasTaggedClass && isOnData
}

const exprContainsDataTaggedClass = (
  typeExpr: ts.ExpressionWithTypeArguments
): boolean => {
  const callExpr = Option.liftPredicate(ts.isCallExpression)(
    typeExpr.expression
  )
  const calleeExpr = Option.map(callExpr, callExpression)
  const propAccess = Option.filter(calleeExpr, ts.isPropertyAccessExpression)

  return Option.exists(propAccess, isDataTaggedCallee)
}

const extendsDataTaggedClass = (clause: ts.HeritageClause): boolean =>
  Array.some(clause.types, exprContainsDataTaggedClass)

const hasDataTaggedClassHeritage = (
  classNode: ts.ClassDeclaration
): boolean => {
  const clauses = classNode.heritageClauses ?? []
  const clause = Array.findFirst(clauses, isExtendsClause)

  return Option.exists(clause, extendsDataTaggedClass)
}

const isDataTaggedClassDeclaration = (
  node: ts.Node
): node is ts.ClassDeclaration => {
  const classOption = Option.liftPredicate(ts.isClassDeclaration)(node)

  return Option.exists(classOption, hasDataTaggedClassHeritage)
}

const dataTaggedClassMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (
    declaration: ts.ClassDeclaration
  ): ReadonlyArray<Detection> => {
    const node = namedDetectionTarget(declaration)

    return [
      match({
        node,
        message: "Avoid Data.TaggedClass — use Schema.TaggedClass instead.",
        hint:
          "Schema.TaggedClass provides the same tagged-class features as Data.TaggedClass " +
          "plus Schema validation, encoding, decoding, and Schema.is() type guards."
      })
    ]
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.ClassDeclaration])(
  isDataTaggedClassDeclaration
)(dataTaggedClassMatches)

export const noDataTaggedClass: Check = check

export const noDataTaggedClassExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-data-tagged-class")
