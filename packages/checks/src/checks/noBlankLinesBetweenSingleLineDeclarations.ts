import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { isDeclarationStatement, isStatementContainer } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const singleLineDeclarationKindList: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration
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

const contiguousSingleLineBlankLineMatches = (context: CheckContext) => {
  const match = detection(context)
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
    const currentIsSingleLine = end.line === start.line
    const insideFunction = isInsideFunction(node)
    const parent = node.parent

    const siblingsOption = pipe(
      Option.liftPredicate(isStatementContainer)(parent),
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
            const previousIsDeclaration = isDeclarationStatement(prev)
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

const check = nodeCheck(singleLineDeclarationKindList)(isDeclarationStatement)(
  contiguousSingleLineBlankLineMatches
)

export const noBlankLinesBetweenSingleLineDeclarations: Check = check

export const noBlankLinesBetweenSingleLineDeclarationsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-blank-lines-between-single-line-declarations")
