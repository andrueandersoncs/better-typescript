import { Option, Struct } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isExtendsClause, namedNodeReportTarget } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-data-tagged-class"

const hasTaggedClassName = (name: ts.MemberName): boolean =>
  name.text === "TaggedClass"

const isTaggedClassProperty = (expression: ts.Expression): boolean =>
  ts.isPropertyAccessExpression(expression) &&
  hasTaggedClassName(expression.name)

const accessExpression: (access: ts.PropertyAccessExpression) => ts.Expression =
  Struct.get("expression")

const callExpression: (call: ts.CallExpression) => ts.Expression =
  Struct.get("expression")

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
  clause.types.some(exprContainsDataTaggedClass)

const hasDataTaggedClassHeritage = (
  classNode: ts.ClassDeclaration
): boolean => {
  const clauses = classNode.heritageClauses ?? []
  const found = clauses.find(isExtendsClause)
  const clause = Option.fromNullable(found)

  return Option.exists(clause, extendsDataTaggedClass)
}

const isDataTaggedClassDeclaration = (
  node: ts.Node
): node is ts.ClassDeclaration => {
  const classOption = Option.liftPredicate(ts.isClassDeclaration)(node)

  return Option.exists(classOption, hasDataTaggedClassHeritage)
}

const dataTaggedClassMatches = (
  declaration: ts.ClassDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const node = namedNodeReportTarget(declaration)

  return [
    createRuleMatch(context, {
      ruleId,
      node,
      message: "Avoid Data.TaggedClass — use Schema.TaggedClass instead.",
      hint:
        "Schema.TaggedClass provides the same tagged-class features as Data.TaggedClass " +
        "plus Schema validation, encoding, decoding, and Schema.is() type guards."
    })
  ]
}

const check = onNode(
  [ts.SyntaxKind.ClassDeclaration],
  isDataTaggedClassDeclaration,
  dataTaggedClassMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/model.ts",
  code: `class MyEvent extends Data.TaggedClass("MyEvent")<{
  readonly payload: string
}> {}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/model.ts",
  code: `class MyEvent extends Schema.TaggedClass<MyEvent>()("MyEvent", {
  payload: Schema.String
}) {}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noDataTaggedClass = new Rule({
  id: ruleId,
  description:
    "Disallow Data.TaggedClass in favor of Schema.TaggedClass for tagged data types.",
  example,
  check
})
