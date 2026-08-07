import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { isDeclarationStatement } from "../support/declarationStatement.js"
import { isStatementContainer } from "../support/statementContainer.js"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { isFunctionLike } from "./functionLikeKinds.js"
import { fallbackFalse } from "./fallbackFalse.js"

// NoBlankLinesBetweenSingleLineDeclarationsFact is empty because matchers share identity.
export const NoBlankLinesBetweenSingleLineDeclarationsFact = Schema.Struct({})

export interface NoBlankLinesBetweenSingleLineDeclarationsFact extends Schema.Schema.Type<
  typeof NoBlankLinesBetweenSingleLineDeclarationsFact
> {}

// emptyNoBlankLinesBetweenSingleLineDeclarationsFact is empty because matchers share identity.
export const emptyNoBlankLinesBetweenSingleLineDeclarationsFact =
  NoBlankLinesBetweenSingleLineDeclarationsFact.make({})

const singleLineDeclarationKindList: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration
)

const singleLineBlankLinePattern = /\n[ \t]*\r?\n/

const fallbackMissingIndex = Function.constant(-1)

const parentContinuesFunctionSearch = (parent: ts.Node) => {
  const parentIsFunction = isFunctionLike(parent)
  const parentIsSourceFile = ts.isSourceFile(parent)
  const parentIsNotFunction = strictEqual(false)(parentIsFunction)
  const parentIsNotSourceFile = strictEqual(false)(parentIsSourceFile)
  const continueSearchConditions = Array.make(parentIsNotFunction, parentIsNotSourceFile)

  return Array.every(continueSearchConditions, Boolean)
}

const isInsideFunction = (node: ts.Node): boolean =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.map((parent) => {
      const parentIsFunction = isFunctionLike(parent)
      const continueSearch = parentContinuesFunctionSearch(parent)
      const nestedHit = continueSearch && isInsideFunction(parent)
      const hitConditions = Array.make(parentIsFunction, nestedHit)

      return Array.some(hitConditions, Boolean)
    }),
    Option.getOrElse(fallbackFalse)
  )

const blankLinesBetweenSingleLineDeclarationsMatches = (context: MatchContext) => {
  const text = context.sourceFile.getFullText()

  const matchDeclarationStatement = (node: ts.Statement) => {
    if (!isDeclarationStatement(node)) {
      return Array.empty()
    }

    const startPosition = node.getStart(context.sourceFile)
    const endPosition = node.getEnd()
    const start = context.sourceFile.getLineAndCharacterOfPosition(startPosition)
    const end = context.sourceFile.getLineAndCharacterOfPosition(endPosition)
    const currentIsSingleLine = strictEqual(start.line)(end.line)
    const insideFunction = isInsideFunction(node)

    const siblingsOption = pipe(
      Option.liftPredicate(isStatementContainer)(node.parent),
      Option.map(Struct.get("statements"))
    )

    const previousHasBlankLineGap = (siblings: ReadonlyArray<ts.Statement>) => {
      const isCurrentNode = strictEqual(node)

      const index = pipe(
        Array.findFirstIndex(siblings, isCurrentNode),
        Option.getOrElse(fallbackMissingIndex)
      )

      const previous = Array.get(siblings, index - 1)

      const previousCreatesBlankGap = (prev: ts.Statement) => {
        const previousIsDeclaration = isDeclarationStatement(prev)
        const previousStartPosition = prev.getStart(context.sourceFile)
        const previousEndPosition = prev.getEnd()

        const previousStart =
          context.sourceFile.getLineAndCharacterOfPosition(previousStartPosition)

        const previousEnd = context.sourceFile.getLineAndCharacterOfPosition(previousEndPosition)
        const previousIsSingleLine = strictEqual(previousStart.line)(previousEnd.line)
        const beforeEnd = prev.getEnd()
        const afterStart = node.getStart(context.sourceFile)
        const between = text.slice(beforeEnd, afterStart)
        const hasBlankLine = singleLineBlankLinePattern.test(between)
        const gapConditions = Array.make(previousIsDeclaration, previousIsSingleLine, hasBlankLine)

        return Array.every(gapConditions, Boolean)
      }

      return pipe(previous, Option.map(previousCreatesBlankGap), Option.getOrElse(fallbackFalse))
    }

    const hasBlankLineAfterPreviousSingleLine = pipe(
      siblingsOption,
      Option.map(previousHasBlankLineGap),
      Option.getOrElse(fallbackFalse)
    )

    const flagConditions = Array.make(
      insideFunction,
      currentIsSingleLine,
      hasBlankLineAfterPreviousSingleLine
    )

    const shouldFlag = Array.every(flagConditions, Boolean)

    if (!shouldFlag) {
      return Array.empty()
    }

    const match = makeNodeMatch(node, emptyNoBlankLinesBetweenSingleLineDeclarationsFact)

    return Array.of(match)
  }

  return matchDeclarationStatement
}

export const noBlankLinesBetweenSingleLineDeclarationsMatcher = nodeMatcher(
  singleLineDeclarationKindList
)(isDeclarationStatement)(blankLinesBetweenSingleLineDeclarationsMatches)
