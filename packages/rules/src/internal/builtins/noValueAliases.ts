import { Array, Function, Match, Option, Schema, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoValueAliasesFact is empty because the alias declaration identifies the finding.
export const NoValueAliasesFact = Schema.Struct({})

export interface NoValueAliasesFact extends Schema.Schema.Type<typeof NoValueAliasesFact> {}

// emptyNoValueAliasesFact exists because its fields form one stable data contract used by the linter.
export const emptyNoValueAliasesFact = NoValueAliasesFact.make({})

const aliasWrapperExpression = (expression: ts.Expression) =>
  pipe(
    Match.value(expression),
    Match.when(
      ts.isParenthesizedExpression,
      Struct.get<ts.ParenthesizedExpression, "expression">("expression")
    ),
    Match.when(ts.isAsExpression, Struct.get<ts.AsExpression, "expression">("expression")),
    Match.when(
      ts.isSatisfiesExpression,
      Struct.get<ts.SatisfiesExpression, "expression">("expression")
    ),
    Match.when(
      ts.isTypeAssertionExpression,
      Struct.get<ts.TypeAssertion, "expression">("expression")
    ),
    Match.when(
      ts.isNonNullExpression,
      Struct.get<ts.NonNullExpression, "expression">("expression")
    ),
    Match.option
  )

const unwrapAliasExpression = (expression: ts.Expression): ts.Expression =>
  pipe(
    aliasWrapperExpression(expression),
    Option.map(unwrapAliasExpression),
    Option.getOrElse(Function.constant(expression))
  )

const hasNoOptionalChain = flow(
  Struct.get<ts.PropertyAccessExpression, "questionDotToken">("questionDotToken"),
  Option.fromNullishOr,
  Option.isNone
)

const isDottedValueReference = (expression: ts.Expression): boolean =>
  pipe(
    Match.value(expression),
    Match.when(ts.isIdentifier, Function.constTrue),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const continuesChain = hasNoOptionalChain(access)
      const baseIsDotted = isDottedValueReference(access.expression)
      const chainConditions = Array.make(continuesChain, baseIsDotted)

      return Array.every(chainConditions, Boolean)
    }),
    Match.orElse(Function.constFalse)
  )

const isConstDeclaration = (declaration: ts.VariableDeclaration) => {
  const parentList = Option.liftPredicate(ts.isVariableDeclarationList)(declaration.parent)
  const hasConstFlag = (list: ts.VariableDeclarationList) => (list.flags & ts.NodeFlags.Const) !== 0

  return Option.exists(parentList, hasConstFlag)
}

const isValueAlias = (declaration: ts.VariableDeclaration) => {
  const constDeclaration = isConstDeclaration(declaration)

  const hasAliasInitializer = pipe(
    Option.liftPredicate(ts.isIdentifier)(declaration.name),
    Option.flatMap(() => Option.fromNullishOr(declaration.initializer)),
    Option.map(unwrapAliasExpression),
    Option.exists(isDottedValueReference)
  )

  return pipe(Array.make(constDeclaration, hasAliasInitializer), Array.every(Boolean))
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

const valueAliasMatches = () => (declaration: ts.VariableDeclaration) => {
  if (!isValueAlias(declaration)) {
    return Array.empty()
  }

  const match = makeNodeMatch(declaration, emptyNoValueAliasesFact)

  return Array.of(match)
}

export const noValueAliasesScanner = makeNodeScanner(variableDeclarationKinds)(
  ts.isVariableDeclaration
)(valueAliasMatches)
