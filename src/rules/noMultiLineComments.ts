import * as path from "node:path"
import { Array as Arr, Option, Schema, Struct } from "effect"
import * as ts from "typescript"
import { onFile } from "./ruleCheck.js"
import { Rule, RuleMatch } from "./types.js"
import type { RuleContext } from "./types.js"

const ruleId = "no-multi-line-comments"

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. For architectural decisions that require longer " +
  "explanation, create an Architectural Decision Record (ADR) as a markdown file in " +
  "the adrs/ directory instead."

class ScannedToken extends Schema.Class<ScannedToken>("ScannedToken")({
  kind: Schema.Number,
  pos: Schema.Number
}) {}

// Array.unfold drives the stateful scanner with a bounded internal loop; recursion overflows large files.
const scanNextToken = (scanner: ts.Scanner): Option.Option<readonly [ScannedToken, ts.Scanner]> => {
  const kind = scanner.scan()

  if (kind === ts.SyntaxKind.EndOfFileToken) {
    return Option.none()
  }

  const pos = scanner.getTokenStart()
  const token = new ScannedToken({ kind, pos })

  return Option.some([token, scanner])
}

const scanTokens = (text: string): ReadonlyArray<ScannedToken> => {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text
  )

  return Arr.unfold(scanner, scanNextToken)
}

const blockCommentEnd = (text: string, pos: number): number => {
  const closeIndex = text.indexOf("*/", pos)
  const notFound = closeIndex === -1

  return notFound ? text.length : closeIndex + 2
}

const commentContainsNewline = (text: string, token: ScannedToken): boolean => {
  const end = blockCommentEnd(text, token.pos)
  const commentText = text.slice(token.pos, end)

  return commentText.indexOf("\n") !== -1
}

const isMultiLineBlock =
  (text: string) =>
  (token: ScannedToken): boolean => {
    const isBlock = token.kind === ts.SyntaxKind.MultiLineCommentTrivia

    return isBlock ? commentContainsNewline(text, token) : isBlock
  }

const isSingleLineComment = (token: ScannedToken): boolean =>
  token.kind === ts.SyntaxKind.SingleLineCommentTrivia

const tokenPos = Struct.get("pos")

const lineOf = (sourceFile: ts.SourceFile, pos: number): number =>
  sourceFile.getLineAndCharacterOfPosition(pos).line

const isAdjacentLine = (sourceFile: ts.SourceFile, a: ScannedToken, b: ScannedToken): boolean =>
  lineOf(sourceFile, b.pos) - lineOf(sourceFile, a.pos) === 1

const prevBreaksRun = (
  sourceFile: ts.SourceFile,
  singles: ReadonlyArray<ScannedToken>,
  index: number
): boolean => {
  const prev = singles[index - 1]
  const current = singles[index]
  const notAdjacent = !isAdjacentLine(sourceFile, prev, current)
  const prevNotSingle = !isSingleLineComment(prev)

  return notAdjacent || prevNotSingle
}

const isRunStart = (
  sourceFile: ts.SourceFile,
  singles: ReadonlyArray<ScannedToken>,
  index: number
): boolean => {
  const isFirst = index === 0

  return isFirst ? isFirst : prevBreaksRun(sourceFile, singles, index)
}

const runStartPosition =
  (sourceFile: ts.SourceFile, singles: ReadonlyArray<ScannedToken>) =>
  (current: ScannedToken, index: number): Option.Option<number> => {
    const hasNextAdjacent =
      index < singles.length - 1 && isAdjacentLine(sourceFile, current, singles[index + 1])
    const shouldFlag = isRunStart(sourceFile, singles, index) && hasNextAdjacent

    return shouldFlag ? Option.some(current.pos) : Option.none()
  }

// filterMap stays bounded by the comment array; per-comment recursion overflows large files.
const collectAdjacentRunStarts = (
  sourceFile: ts.SourceFile,
  singles: ReadonlyArray<ScannedToken>
): ReadonlyArray<number> => Arr.filterMap(singles, runStartPosition(sourceFile, singles))

const multiLinePositions = (
  tokens: ReadonlyArray<ScannedToken>,
  sourceFile: ts.SourceFile,
  text: string
): ReadonlyArray<number> => {
  const blockPositions = tokens.filter(isMultiLineBlock(text)).map(tokenPos)
  const singleLineTokens = tokens.filter(isSingleLineComment)
  const adjacentRunPositions = collectAdjacentRunStarts(sourceFile, singleLineTokens)

  return blockPositions.concat(adjacentRunPositions)
}

const positionToMatch =
  (context: RuleContext, fileName: string) =>
  (pos: number): RuleMatch => {
    const location = context.sourceFile.getLineAndCharacterOfPosition(pos)

    return new RuleMatch({
      ruleId,
      fileName,
      line: location.line + 1,
      column: location.character + 1,
      message,
      hint
    })
  }

const fileMatches = (context: RuleContext): ReadonlyArray<RuleMatch> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName = path.relative(context.projectRoot, sourceFile.fileName) || sourceFile.fileName
  const tokens = scanTokens(text)
  const positions = multiLinePositions(tokens, sourceFile, text)

  return positions.map(positionToMatch(context, fileName))
}

const check = onFile(fileMatches)

export const noMultiLineComments = new Rule({
  id: ruleId,
  description:
    "Disallow multi-line comments in favor of self-documenting code and ADRs for architectural decisions.",
  check
})
