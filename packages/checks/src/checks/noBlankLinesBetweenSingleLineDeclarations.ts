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
 * and contiguous single-line blank-line matching.
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

const singleLineDeclarationKindList: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration
)

const singleLineDeclarationKinds = HashSet.fromIterable(singleLineDeclarationKindList)

const singleLineStatementContainerKinds = HashSet.make(
  ts.SyntaxKind.SourceFile,
  ts.SyntaxKind.Block,
  ts.SyntaxKind.ModuleBlock,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.DefaultClause
)

const functionLikeKinds = HashSet.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

const message = "Single-line declarations must not have blank lines between them."

const hint =
  "Remove the empty line between these adjacent single-line declarations so they " +
  "stay contiguous. Blank lines remain required around multi-line declarations; " +
  "keep those separators when a neighbor is multi-line."

const singleLineBlankLinePattern = /\n[ \t]*\r?\n/

const fallbackFalse = Function.constant(false)

const fallbackMissingIndex = Function.constant(-1)

const isSingleLineDeclarationStatement = (node: ts.Node): node is DeclarationStatement =>
  HashSet.has(singleLineDeclarationKinds, node.kind)

const isSingleLineStatementContainer = (node: ts.Node): node is StatementContainer =>
  HashSet.has(singleLineStatementContainerKinds, node.kind)

const isFunctionLike = (node: ts.Node): boolean => HashSet.has(functionLikeKinds, node.kind)

const parentContinuesFunctionSearch = (parent: ts.Node): boolean => {
  const parentIsFunction = isFunctionLike(parent)
  const parentIsSourceFile = ts.isSourceFile(parent)
  const parentIsNotFunction = parentIsFunction === false
  const parentIsNotSourceFile = parentIsSourceFile === false
  const continueSearchConditions = Array.make(parentIsNotFunction, parentIsNotSourceFile)

  return Array.every(continueSearchConditions, Boolean)
}

const isInsideFunction = (node: ts.Node): boolean =>
  pipe(
    Option.fromNullable(node.parent),
    Option.map((parent) => {
      const parentIsFunction = isFunctionLike(parent)
      const continueSearch = parentContinuesFunctionSearch(parent)
      const nestedHit = continueSearch && isInsideFunction(parent)
      const hitConditions = Array.make(parentIsFunction, nestedHit)

      return Array.some(hitConditions, Boolean)
    }),
    Option.getOrElse(fallbackFalse)
  )

const contiguousSingleLineBlankLineMatches = (context: CheckContext) => {
  const match = detection(context)
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()

  const matches = (node: DeclarationStatement): ReadonlyArray<Detection> => {
    const startPosition = node.getStart(sourceFile)
    const endPosition = node.getEnd()
    const start = sourceFile.getLineAndCharacterOfPosition(startPosition)
    const end = sourceFile.getLineAndCharacterOfPosition(endPosition)
    const currentIsSingleLine = end.line === start.line
    const insideFunction = isInsideFunction(node)
    const parent = node.parent

    const siblingsOption = pipe(
      Option.liftPredicate(isSingleLineStatementContainer)(parent),
      Option.map(Struct.get("statements"))
    )

    const hasBlankLineAfterPreviousSingleLine = pipe(
      siblingsOption,
      Option.map((siblings) => {
        const index = pipe(
          Array.findFirstIndex(siblings, (sibling) => sibling === node),
          Option.getOrElse(fallbackMissingIndex)
        )

        const previous = Array.get(siblings, index - 1)

        return pipe(
          previous,
          Option.map((prev) => {
            const previousIsDeclaration = isSingleLineDeclarationStatement(prev)
            const previousStartPosition = prev.getStart(sourceFile)
            const previousEndPosition = prev.getEnd()
            const previousStart = sourceFile.getLineAndCharacterOfPosition(previousStartPosition)
            const previousEnd = sourceFile.getLineAndCharacterOfPosition(previousEndPosition)
            const previousIsSingleLine = previousEnd.line === previousStart.line
            const beforeEnd = prev.getEnd()
            const afterStart = node.getStart(sourceFile)
            const between = text.slice(beforeEnd, afterStart)
            const hasBlankLine = singleLineBlankLinePattern.test(between)

            const gapConditions = Array.make(
              previousIsDeclaration,
              previousIsSingleLine,
              hasBlankLine
            )

            return Array.every(gapConditions, Boolean)
          }),
          Option.getOrElse(fallbackFalse)
        )
      }),
      Option.getOrElse(fallbackFalse)
    )

    const flagConditions = Array.make(
      insideFunction,
      currentIsSingleLine,
      hasBlankLineAfterPreviousSingleLine
    )

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

const check = nodeCheck(singleLineDeclarationKindList)(isSingleLineDeclarationStatement)(contiguousSingleLineBlankLineMatches)

export const noBlankLinesBetweenSingleLineDeclarations: Check = check

export const noBlankLinesBetweenSingleLineDeclarationsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-blank-lines-between-single-line-declarations")
