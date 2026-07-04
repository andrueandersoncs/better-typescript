import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import {
  isReturnTypeDeclaration,
  namedNodeReportTarget,
  returnTypeNode
} from "./tsNode.js"
import type { ReturnTypeDeclaration } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "no-raw-object-types"

const containsRawObjectType = (typeNode: ts.TypeNode): boolean =>
  [
    ts.isTypeLiteralNode(typeNode),
    typeNode.kind === ts.SyntaxKind.ObjectKeyword,
    ts.isUnionTypeNode(typeNode) && typeNode.types.some(containsRawObjectType),
    ts.isIntersectionTypeNode(typeNode) &&
      typeNode.types.some(containsRawObjectType),
    ts.isParenthesizedTypeNode(typeNode) && containsRawObjectType(typeNode.type)
  ].some(Boolean)

const parameterTypeNode = (
  param: ts.ParameterDeclaration
): Option.Option<ts.TypeNode> => Option.fromNullable(param.type)

type RawObjectTarget = ts.ParameterDeclaration | ReturnTypeDeclaration

const rawObjectParameterMatch =
  (match: CreateMatch) =>
  (node: ts.ParameterDeclaration): Finding =>
    match({
      ruleId,
      node,
      message:
        "Parameter uses an anonymous object type instead of a named type.",
      hint:
        "Define a named type or interface that describes the data's domain meaning — " +
        "for example ConnectionConfig instead of { host: string, port: number }. " +
        "Name the type after what the data represents, not its structural role " +
        "(avoid names like FooParameters or BarOptions)."
    })

const rawObjectReturnTypeMatch =
  (match: CreateMatch) =>
  (node: ReturnTypeDeclaration): Finding => {
    const reportNode = namedNodeReportTarget(node)

    return match({
      ruleId,
      node: reportNode,
      message:
        "Return type uses an anonymous object type instead of a named type.",
      hint:
        "Define a named type or interface that describes the data's domain meaning — " +
        "for example UserProfile instead of { name: string, age: number }. " +
        "Name the type after what the data represents, not its structural role " +
        "(avoid names like FooResult or BarResponse)."
    })
  }

const isRawObjectTarget = (node: ts.Node): node is RawObjectTarget =>
  pipe(
    Option.liftPredicate(ts.isParameter)(node),
    Option.flatMap(parameterTypeNode),
    Option.exists(containsRawObjectType)
  ) ||
  pipe(
    Option.liftPredicate(isReturnTypeDeclaration)(node),
    Option.flatMap(returnTypeNode),
    Option.exists(containsRawObjectType)
  )

const rawObjectTargetKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.GetAccessor
]

// The context stage runs once per file, so both rule-match partials are shared by every raw-object target the dispatcher feeds to matches.
const rawObjectTypeMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)
  const parameterMatch = rawObjectParameterMatch(match)
  const returnTypeMatch = rawObjectReturnTypeMatch(match)

  const matches = (node: RawObjectTarget): ReadonlyArray<Finding> =>
    ts.isParameter(node) ? [parameterMatch(node)] : [returnTypeMatch(node)]

  return matches
}

const check =
  onNode(rawObjectTargetKinds)(isRawObjectTarget)(rawObjectTypeMatches)

const badExample = new ExampleSnippet({
  filePath: "src/server.ts",
  code: `import { Effect } from "effect"

declare const listen: (config: { host: string, port: number }) => void

export const startServer = (config: { host: string, port: number }) =>
  Effect.sync(() => listen(config))`
})

const goodExample = new ExampleSnippet({
  filePath: "src/server.ts",
  code: `import { Effect } from "effect"

interface ServerAddress {
  readonly host: string
  readonly port: number
}

declare const listen: (address: ServerAddress) => void

export const startServer = (address: ServerAddress) =>
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
