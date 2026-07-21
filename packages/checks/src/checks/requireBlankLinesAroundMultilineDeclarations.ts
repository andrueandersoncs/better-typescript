import { Array, Function, Option, pipe, Struct } from "effect"
import * as ts from "typescript"
import { isDeclarationStatement, isStatementContainer } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const declarationKindList: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration
)

const message = "Multi-line declarations must have a blank line above and below."

const hint =
  "Insert an empty line before and after this declaration so its multi-line shape " +
  "is visually separated from neighboring statements. Single-line declarations do " +
  "not need surrounding blank lines; the first and last statements in a block are " +
  "exempt on the outer sides."

const blankLinePattern = /\n[ \t]*\r?\n/

const fallbackFalse = Function.constant(false)

const fallbackTrue = Function.constant(true)

const fallbackMissingIndex = Function.constant(-1)

const blankLineMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
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

    const blankLineMatch = match({
      node,
      message,
      hint
    })

    return shouldFlag ? Array.of(blankLineMatch) : Array.empty()
  }

  return matches
}

export const requireBlankLinesAroundMultilineDeclarations = makeCheck(
  "require-blank-lines-around-multiline-declarations",
  declarationKindList,
  isDeclarationStatement,
  blankLineMatches
)
