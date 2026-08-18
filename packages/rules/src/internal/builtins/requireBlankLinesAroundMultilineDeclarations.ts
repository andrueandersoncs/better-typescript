import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { isDeclarationStatement } from "../support/declarationStatement.js"
import { isStatementContainer } from "../support/statementContainer.js"
import { strictEqual } from "../equivalence.js"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"

// RequireBlankLinesAroundMultilineDeclarationsFact exists because its fields form one stable data contract used by the linter.
export const RequireBlankLinesAroundMultilineDeclarationsFact = Schema.Struct({})

export interface RequireBlankLinesAroundMultilineDeclarationsFact extends Schema.Schema.Type<
  typeof RequireBlankLinesAroundMultilineDeclarationsFact
> {}

// emptyRequireBlankLinesAroundMultilineDeclarationsFact exists because its fields form one stable data contract used by the linter.
export const emptyRequireBlankLinesAroundMultilineDeclarationsFact =
  RequireBlankLinesAroundMultilineDeclarationsFact.make({})

const declarationKindList: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration
)

const blankLinePattern = /\n[ \t]*\r?\n/

const fallbackFalse = Function.constant(false)
const fallbackTrue = Function.constant(true)
const fallbackMissingIndex = Function.constant(-1)

const matches = (context: MatchContext) => {
  const text = context.sourceFile.getFullText()

  const matchDeclaration = (node: ts.Node) => {
    if (!isDeclarationStatement(node)) {
      return Array.empty()
    }

    const startPosition = node.getStart(context.sourceFile)
    const endPosition = node.getEnd()
    const start = context.sourceFile.getLineAndCharacterOfPosition(startPosition)
    const end = context.sourceFile.getLineAndCharacterOfPosition(endPosition)
    const isMultiLine = end.line > start.line

    const siblingsOption = pipe(
      Option.liftPredicate(isStatementContainer)(node.parent),
      Option.map(Struct.get("statements"))
    )

    const missingPadding = pipe(
      siblingsOption,
      Option.map((siblings) => {
        const isCurrentNode = strictEqual(node)

        const index = pipe(
          Array.findFirstIndex(siblings, isCurrentNode),
          Option.getOrElse(fallbackMissingIndex)
        )

        const previous = Array.get(siblings, index - 1)
        const next = Array.get(siblings, index + 1)

        const aboveOk = pipe(
          previous,
          Option.map((prev) => {
            const beforeEnd = prev.getEnd()
            const afterStart = node.getStart(context.sourceFile)
            const between = text.slice(beforeEnd, afterStart)

            return blankLinePattern.test(between)
          }),
          Option.getOrElse(fallbackTrue)
        )

        const belowOk = pipe(
          next,
          Option.map((following) => {
            const beforeEnd = node.getEnd()
            const afterStart = following.getStart(context.sourceFile)
            const between = text.slice(beforeEnd, afterStart)

            return blankLinePattern.test(between)
          }),
          Option.getOrElse(fallbackTrue)
        )

        const paddingConditions = Array.make(aboveOk, belowOk)
        const paddingOk = Array.every(paddingConditions, Boolean)

        return strictEqual(false)(paddingOk)
      }),
      Option.getOrElse(fallbackFalse)
    )

    const flagConditions = Array.make(isMultiLine, missingPadding)
    const shouldFlag = Array.every(flagConditions, Boolean)

    if (!shouldFlag) {
      return Array.empty()
    }

    const match = makeNodeMatch(node, emptyRequireBlankLinesAroundMultilineDeclarationsFact)

    return Array.of(match)
  }

  return matchDeclaration
}

export const requireBlankLinesAroundMultilineDeclarationsScanner =
  nodeScanner(declarationKindList)(isDeclarationStatement)(matches)
