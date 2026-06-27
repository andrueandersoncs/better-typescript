import { Option } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isReturnTypeDeclaration, namedNodeReportTarget } from "./tsNode.js"
import type { ReturnTypeDeclaration } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-raw-object-types"

const containsRawObjectType = (typeNode: ts.TypeNode): boolean =>
  [
    ts.isTypeLiteralNode(typeNode),
    typeNode.kind === ts.SyntaxKind.ObjectKeyword,
    ts.isUnionTypeNode(typeNode) && typeNode.types.some(containsRawObjectType),
    ts.isIntersectionTypeNode(typeNode) && typeNode.types.some(containsRawObjectType),
    ts.isParenthesizedTypeNode(typeNode) && containsRawObjectType(typeNode.type)
  ].some(Boolean)

const parameterHasRawObjectType = (
  node: ts.Node
): node is ts.ParameterDeclaration => {
  if (ts.isParameter(node)) {
    const typeNode = Option.fromNullable(node.type)

    return Option.exists(typeNode, containsRawObjectType)
  }

  return false
}

const rawObjectParameterMatches = (
  node: ts.ParameterDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {ruleId,
  node,
  message: "Parameter uses an anonymous object type instead of a named type.",
  hint:
    "Define a named type or interface that describes the data's domain meaning — " +
    "for example ConnectionConfig instead of { host: string, port: number }. " +
    "Name the type after what the data represents, not its structural role " +
    "(avoid names like FooParameters or BarOptions)."})
]

const declaredReturnTypeContainsRawObject = (node: ReturnTypeDeclaration): boolean => {
  const typeNode = Option.fromNullable(node.type)

  return Option.exists(typeNode, containsRawObjectType)
}

const isRawObjectReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration =>
  isReturnTypeDeclaration(node) ? declaredReturnTypeContainsRawObject(node) : false

const rawObjectReturnTypeMatches = (
  node: ReturnTypeDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const reportNode = namedNodeReportTarget(node)

  return [
    createRuleMatch(context, {ruleId,
    node: reportNode,
    message: "Return type uses an anonymous object type instead of a named type.",
    hint:
      "Define a named type or interface that describes the data's domain meaning — " +
      "for example UserProfile instead of { name: string, age: number }. " +
      "Name the type after what the data represents, not its structural role " +
      "(avoid names like FooResult or BarResponse)."})
  ]
}

const returnTypeDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.GetAccessor
]

const parameterListener = onNode(
  [ts.SyntaxKind.Parameter],
  parameterHasRawObjectType,
  rawObjectParameterMatches
)

const returnTypeListener = onNode(
  returnTypeDeclarationKinds,
  isRawObjectReturnTypeDeclaration,
  rawObjectReturnTypeMatches
)

const check = combineAll([parameterListener, returnTypeListener])

const badExample = new ExampleSnippet({
  filePath: "src/server.ts",
  code: `const startServer = (config: { host: string, port: number }) =>
  Effect.sync(() => listen(config))`
})

const goodExample = new ExampleSnippet({
  filePath: "src/server.ts",
  code: `interface ServerAddress {
  readonly host: string
  readonly port: number
}

const startServer = (address: ServerAddress) =>
  Effect.sync(() => listen(address))`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noRawObjectTypes = new Rule({
  id: ruleId,
  description:
    "Disallow anonymous object types in function parameters and return types in favor of named types.",
  example,
  check
})
