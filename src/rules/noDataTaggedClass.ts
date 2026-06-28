import { Option, Struct } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isExtendsClause, namedNodeReportTarget } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-data-tagged-class"

const extendsClause = (declaration: ts.ClassDeclaration): Option.Option<ts.HeritageClause> => {
  const clauses = declaration.heritageClauses ?? []
  const found = clauses.find(isExtendsClause)

  return Option.fromNullable(found)
}

const hasTaggedClassName = (name: ts.MemberName): boolean => name.text === "TaggedClass"

const isTaggedClassProperty = (expression: ts.Expression): boolean =>
  ts.isPropertyAccessExpression(expression) && hasTaggedClassName(expression.name)

const hasDataName = (identifier: ts.Identifier): boolean => identifier.text === "Data"

const isDataIdentifier = (expression: ts.Expression): boolean =>
  ts.isIdentifier(expression) && hasDataName(expression)

const accessExpression: (access: ts.PropertyAccessExpression) => ts.Expression =
  Struct.get("expression")

const isDataTaggedClassAccess = (access: ts.PropertyAccessExpression): boolean => {
  const object = accessExpression(access)
  const hasTaggedClass = hasTaggedClassName(access.name)
  const isOnData = isDataIdentifier(object)

  return hasTaggedClass && isOnData
}

const callExpression: (call: ts.CallExpression) => ts.Expression = Struct.get("expression")

const isCallToDataTaggedClass = (call: ts.CallExpression): boolean => {
  const callee = callExpression(call)

  return isPropertyAccessCall(callee)
}

const isDataTaggedClassCall = (expression: ts.Expression): boolean =>
  ts.isCallExpression(expression)
    ? isCallToDataTaggedClass(expression)
    : false

const isPropertyAccessCall = (expression: ts.Expression): boolean =>
  ts.isPropertyAccessExpression(expression)
    ? isDataTaggedClassAccess(expression)
    : false

const exprContainsDataTaggedClass = (typeExpr: ts.ExpressionWithTypeArguments): boolean =>
  isDataTaggedClassCall(typeExpr.expression)

const extendsDataTaggedClass = (clause: ts.HeritageClause): boolean =>
  clause.types.some(exprContainsDataTaggedClass)

const hasDataTaggedClassExtension = (declaration: ts.ClassDeclaration): boolean => {
  const clause = extendsClause(declaration)

  return Option.exists(clause, extendsDataTaggedClass)
}

const isDataTaggedClassDeclaration = (node: ts.Node): node is ts.ClassDeclaration =>
  ts.isClassDeclaration(node)
    ? hasDataTaggedClassExtension(node)
    : false

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
