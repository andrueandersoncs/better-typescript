import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import {
  isReturnTypeDeclaration,
  namedDetectionTarget,
  returnTypeNode
} from "./tsNode.js"
import type { ReturnTypeDeclaration } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

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
  (match: MakeDetection) =>
  (node: ts.ParameterDeclaration): Detection =>
    match({
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
  (match: MakeDetection) =>
  (node: ReturnTypeDeclaration): Detection => {
    const reportNode = namedDetectionTarget(node)

    return match({
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

// The context stage runs once per file, so both rule-match partials are shared by every raw-object target the report wiring feeds to matches.
const rawObjectTypeMatches = (context: RuleContext) => {
  const match = detection(context)
  const parameterMatch = rawObjectParameterMatch(match)
  const returnTypeMatch = rawObjectReturnTypeMatch(match)

  const matches = (node: RawObjectTarget): ReadonlyArray<Detection> =>
    ts.isParameter(node) ? [parameterMatch(node)] : [returnTypeMatch(node)]

  return matches
}

const check =
  nodeCheck(rawObjectTargetKinds)(isRawObjectTarget)(rawObjectTypeMatches)

export const noRawObjectTypes: RuleCheck = check
