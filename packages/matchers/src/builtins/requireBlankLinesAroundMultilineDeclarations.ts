import { Array, Function, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { isDeclarationStatement, isStatementContainer } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"

// RequireBlankLinesAroundMultilineDeclarationsFact is empty because matchers share identity.
export const RequireBlankLinesAroundMultilineDeclarationsFact = Schema.Struct({})

export interface RequireBlankLinesAroundMultilineDeclarationsFact extends Schema.Schema.Type<
  typeof RequireBlankLinesAroundMultilineDeclarationsFact
> {}

// Shared empty fact because guidance and matchers use one RequireBlankLines instance.
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
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()

  const matchDeclaration = (node: ts.Node) => {
    if (!isDeclarationStatement(node)) {
      return Array.empty()
    }

    const startPosition = node.getStart(sourceFile)
    const endPosition = node.getEnd()
    const start = sourceFile.getLineAndCharacterOfPosition(startPosition)
    const end = sourceFile.getLineAndCharacterOfPosition(endPosition)
    const isMultiLine = end.line > start.line
    const parent = node.parent

    const siblingsOption = pipe(
      Option.liftPredicate(isStatementContainer)(parent),
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
            const afterStart = node.getStart(sourceFile)
            const between = text.slice(beforeEnd, afterStart)

            return blankLinePattern.test(between)
          }),
          Option.getOrElse(fallbackTrue)
        )

        const belowOk = pipe(
          next,
          Option.map((following) => {
            const beforeEnd = node.getEnd()
            const afterStart = following.getStart(sourceFile)
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

export const requireBlankLinesAroundMultilineDeclarationsMatcher =
  nodeMatcher(declarationKindList)(isDeclarationStatement)(matches)
