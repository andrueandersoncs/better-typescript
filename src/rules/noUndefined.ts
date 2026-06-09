import * as path from "node:path"
import { Chunk, Effect, Match, Option, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-undefined"

type ReturnTypeDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.CallSignatureDeclaration
  | ts.FunctionTypeNode
  | ts.GetAccessorDeclaration

type UndefinedReturnExpression = ts.ReturnStatement | ts.ArrowFunction
type UndefinedTypeDeclaration = ts.PropertySignature | ts.MappedTypeNode

type UndefinedUsageMatch =
  | {
      readonly kind: "parameter"
      readonly node: ts.ParameterDeclaration
    }
  | {
      readonly kind: "return-type"
      readonly node: ReturnTypeDeclaration
    }
  | {
      readonly kind: "return-expression"
      readonly node: UndefinedReturnExpression
    }
  | {
      readonly kind: "type-declaration"
      readonly node: UndefinedTypeDeclaration
    }
  | {
      readonly kind: "comparison"
      readonly node: ts.BinaryExpression
    }

const optionHint =
  "Use Effect's Option module to model optional values, and convert nullable boundaries " +
  "with Option.fromNullable."

export const noUndefined: Rule = {
  id: ruleId,
  description: "Disallow undefined usage in favor of Effect Option.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.flatMap((node) => Stream.fromIterable(undefinedUsageMatches(node))),
        Stream.map((match) => createMatch(context, match)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const undefinedUsageMatches = (node: ts.Node): ReadonlyArray<UndefinedUsageMatch> =>
  [
    ...parameterUndefinedUsageMatches(node),
    ...returnTypeUndefinedUsageMatches(node),
    ...returnExpressionUndefinedUsageMatches(node),
    ...typeDeclarationUndefinedUsageMatches(node),
    ...comparisonUndefinedUsageMatches(node)
  ]

const parameterUndefinedUsageMatches = (
  node: ts.Node
): ReadonlyArray<UndefinedUsageMatch> =>
  isParameterAcceptingUndefined(node) ? [{ kind: "parameter", node }] : []

const returnTypeUndefinedUsageMatches = (
  node: ts.Node
): ReadonlyArray<UndefinedUsageMatch> =>
  isUndefinedReturnTypeDeclaration(node) ? [{ kind: "return-type", node }] : []

const returnExpressionUndefinedUsageMatches = (
  node: ts.Node
): ReadonlyArray<UndefinedUsageMatch> =>
  isUndefinedReturnExpression(node) ? [{ kind: "return-expression", node }] : []

const typeDeclarationUndefinedUsageMatches = (
  node: ts.Node
): ReadonlyArray<UndefinedUsageMatch> =>
  isUndefinedTypeDeclaration(node) ? [{ kind: "type-declaration", node }] : []

const comparisonUndefinedUsageMatches = (
  node: ts.Node
): ReadonlyArray<UndefinedUsageMatch> =>
  isUndefinedComparison(node) ? [{ kind: "comparison", node }] : []

const isUndefinedComparison = (node: ts.Node): node is ts.BinaryExpression =>
  ts.isBinaryExpression(node) ? comparesAgainstUndefined(node) : false

const isParameterAcceptingUndefined = (
  node: ts.Node
): node is ts.ParameterDeclaration => {
  if (ts.isParameter(node)) {
    const hasQuestionToken = Option.isSome(Option.fromNullable(node.questionToken))
    const hasUndefinedType = containsUndefinedType(Option.fromNullable(node.type))

    return [hasQuestionToken, hasUndefinedType].some(Boolean)
  }

  return false
}

const isUndefinedReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration =>
  isReturnTypeDeclaration(node)
    ? containsUndefinedType(Option.fromNullable(node.type))
    : false

const isReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node),
    ts.isMethodSignature(node),
    ts.isCallSignatureDeclaration(node),
    ts.isFunctionTypeNode(node),
    ts.isGetAccessorDeclaration(node)
  ].some(Boolean)

const isUndefinedReturnExpression = (
  node: ts.Node
): node is UndefinedReturnExpression => {
  const returnStatementReturnsUndefined = Option.match(
    Option.liftPredicate(ts.isReturnStatement)(node),
    {
      onNone: () => false,
      onSome: (returnStatement) =>
        Option.match(Option.fromNullable(returnStatement.expression), {
          onNone: () => false,
          onSome: isUndefinedExpression
        })
    }
  )

  const arrowFunctionReturnsUndefined = Option.match(
    Option.liftPredicate(ts.isArrowFunction)(node),
    {
      onNone: () => false,
      onSome: (arrowFunction) =>
        Option.match(expressionFromConciseBody(arrowFunction.body), {
          onNone: () => false,
          onSome: isUndefinedExpression
        })
    }
  )

  return [returnStatementReturnsUndefined, arrowFunctionReturnsUndefined].some(Boolean)
}

const expressionFromConciseBody = (
  body: ts.ConciseBody
): Option.Option<ts.Expression> =>
  ts.isBlock(body) ? Option.none() : Option.some(body)

const isUndefinedTypeDeclaration = (
  node: ts.Node
): node is UndefinedTypeDeclaration => {
  if (ts.isPropertySignature(node)) {
    const hasQuestionToken = Option.isSome(Option.fromNullable(node.questionToken))
    const hasUndefinedType = containsUndefinedType(Option.fromNullable(node.type))

    return [hasQuestionToken, hasUndefinedType].some(Boolean)
  }

  if (ts.isMappedTypeNode(node)) {
    const hasQuestionToken = isOptionalMappedTypeNode(node)
    const hasUndefinedType = containsUndefinedType(Option.fromNullable(node.type))

    return [hasQuestionToken, hasUndefinedType].some(Boolean)
  }

  return false
}

const isOptionalMappedTypeNode = (node: ts.MappedTypeNode): boolean =>
  Option.match(Option.fromNullable(node.questionToken), {
    onNone: () => false,
    onSome: (questionToken) => questionToken.kind !== ts.SyntaxKind.MinusToken
  })

const containsUndefinedType = (typeNode: Option.Option<ts.TypeNode>): boolean =>
  Option.match(typeNode, {
    onNone: () => false,
    onSome: containsUndefinedKeyword
  })

const containsUndefinedKeyword = (node: ts.Node): boolean => {
  const isUndefinedKeyword = node.kind === ts.SyntaxKind.UndefinedKeyword
  const childContainsUndefinedKeyword =
    ts.forEachChild(node, containsUndefinedKeyword) === true

  return [isUndefinedKeyword, childContainsUndefinedKeyword].some(Boolean)
}

const comparesAgainstUndefined = (expression: ts.BinaryExpression): boolean => {
  const isEqualityComparison = equalityComparisonOperators.has(expression.operatorToken.kind)
  const hasUndefinedOperand = [expression.left, expression.right].some(isUndefinedExpression)

  return [isEqualityComparison, hasUndefinedOperand].every(Boolean)
}

const equalityComparisonOperators = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
])

const isUndefinedExpression = (expression: ts.Expression): boolean => {
  const unwrapped = unwrapExpression(expression)

  return Option.match(Option.liftPredicate(ts.isIdentifier)(unwrapped), {
    onNone: () => false,
    onSome: (identifier) => identifier.text === "undefined"
  })
}

const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression

const createMatch = (context: RuleContext, match: UndefinedUsageMatch): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = match.node.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: messageForMatch(match),
    hint: optionHint
  }
}

const messageForMatch = (match: UndefinedUsageMatch): string =>
  Match.value(match.kind).pipe(
    Match.when("parameter", () => "Avoid function parameters that accept undefined."),
    Match.when("return-type", () => "Avoid function return types that include undefined."),
    Match.when("return-expression", () => "Avoid returning undefined from functions."),
    Match.when(
      "type-declaration",
      () => "Avoid optional or undefined properties in type declarations."
    ),
    Match.when("comparison", () => "Avoid comparing values against undefined."),
    Match.exhaustive
  )

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}
