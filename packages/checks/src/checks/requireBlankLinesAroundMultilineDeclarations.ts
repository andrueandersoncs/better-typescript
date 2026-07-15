import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

/**
 * DeclarationStatement is the syntax contract shared by declaration detection
 * and blank-line matching.
 *
 * @remarks
 *   It remains explicit because both owners need one stable compiler-node
 *   vocabulary; removing it would duplicate the union and let their accepted
 *   declarations drift.
 * @modelRole shared
 */
export type DeclarationStatement =
  | ts.VariableStatement
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.ModuleDeclaration

/**
 * StatementContainer is the compiler syntax protocol handled by
 * declaration-neighbor lookup.
 *
 * @remarks
 *   It remains explicit because source, block, and clause containers share one
 *   operation; removing it would repeat the union and let accepted cases
 *   drift.
 * @modelRole protocol
 */
export type StatementContainer =
  ts.SourceFile | ts.Block | ts.ModuleBlock | ts.CaseClause | ts.DefaultClause

const declarationKindList: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration
)

const declarationKinds = HashSet.fromIterable(declarationKindList)

const statementContainerKinds = HashSet.make(
  ts.SyntaxKind.SourceFile,
  ts.SyntaxKind.Block,
  ts.SyntaxKind.ModuleBlock,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.DefaultClause
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

const isDeclarationStatement = (node: ts.Node): node is DeclarationStatement =>
  HashSet.has(declarationKinds, node.kind)

const isStatementContainer = (node: ts.Node): node is StatementContainer =>
  HashSet.has(statementContainerKinds, node.kind)

const blankLineMatches = (context: CheckContext) => {
  const match = detection(context)
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()

  const matches = (node: DeclarationStatement): ReadonlyArray<Detection> => {
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
        const index = pipe(
          Array.findFirstIndex(siblings, (sibling) => sibling === node),
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

        return paddingOk === false
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

const check = nodeCheck(declarationKindList)(isDeclarationStatement)(blankLineMatches)

export const requireBlankLinesAroundMultilineDeclarations: Check = check

export const requireBlankLinesAroundMultilineDeclarationsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("require-blank-lines-around-multiline-declarations")
