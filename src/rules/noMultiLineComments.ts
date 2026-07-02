import * as path from "node:path"
import { Array as Arr, Option, Schema, Struct } from "effect"
import * as ts from "typescript"
import { onFile } from "./ruleCheck.js"
import { ExampleSnippet, Rule, RuleExample, RuleMatch } from "./types.js"
import type { RuleContext } from "./types.js"

const ruleId = "no-multi-line-comments"

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. JSDoc (/** ... */) documenting an exported API is " +
  "permitted. For architectural decisions that require longer explanation, create an " +
  "Architectural Decision Record (ADR) as a markdown file in the adrs/ directory instead."

class ScannedToken extends Schema.Class<ScannedToken>("ScannedToken")({
  kind: Schema.Number,
  pos: Schema.Number
}) {}

// Array.unfold drives the stateful scanner with a bounded internal loop; recursion overflows large files.
const scanNextToken = (
  scanner: ts.Scanner
): Option.Option<readonly [ScannedToken, ts.Scanner]> => {
  const kind = scanner.scan()

  if (kind === ts.SyntaxKind.EndOfFileToken) {
    return Option.none()
  }

  const pos = scanner.getTokenStart()
  const token = new ScannedToken({ kind, pos })

  return Option.some([token, scanner])
}
type RunStartPosition = (
  current: ScannedToken,
  index: number
) => Option.Option<number>

// JSDoc (`/** ... */`) is API documentation surfaced by editors and doc tooling, not prose comments.
const isMultiLineBlock =
  (text: string) =>
  (token: ScannedToken): boolean => {
    const isBlock = token.kind === ts.SyntaxKind.MultiLineCommentTrivia
    const closeIndex = text.indexOf("*/", token.pos)
    const notFound = closeIndex === -1
    const end = notFound ? text.length : closeIndex + 2
    const commentText = text.slice(token.pos, end)
    const hasNewline = commentText.indexOf("\n") !== -1
    const isJsDoc = commentText.startsWith("/**")

    return [isBlock, hasNewline, !isJsDoc].every(Boolean)
  }

const isSingleLineComment = (token: ScannedToken): boolean =>
  token.kind === ts.SyntaxKind.SingleLineCommentTrivia

const tokenPos = Struct.get("pos")

const lineOf =
  (sourceFile: ts.SourceFile) =>
  (pos: number): number =>
    sourceFile.getLineAndCharacterOfPosition(pos).line

const isAdjacentLine =
  (sourceFile: ts.SourceFile) =>
  (a: ScannedToken) =>
  (b: ScannedToken): boolean =>
    lineOf(sourceFile)(b.pos) - lineOf(sourceFile)(a.pos) === 1

const runStartPosition =
  (sourceFile: ts.SourceFile) =>
  (singles: ReadonlyArray<ScannedToken>): RunStartPosition =>
  (current, index) => {
    const hasNextAdjacent =
      index < singles.length - 1 &&
      isAdjacentLine(sourceFile)(current)(singles[index + 1])

    if (index === 0) {
      return hasNextAdjacent ? Option.some(current.pos) : Option.none()
    }

    const previousToken = singles[index - 1]
    const isNotAdjacentToPrevious =
      !isAdjacentLine(sourceFile)(previousToken)(current)
    const previousIsNotSingleLine = !isSingleLineComment(previousToken)
    const isRunStart = isNotAdjacentToPrevious || previousIsNotSingleLine
    const shouldFlag = isRunStart && hasNextAdjacent

    return shouldFlag ? Option.some(current.pos) : Option.none()
  }

const positionToMatch =
  (sourceFile: ts.SourceFile) =>
  (fileName: string) =>
  (pos: number): RuleMatch => {
    const location = sourceFile.getLineAndCharacterOfPosition(pos)

    return new RuleMatch({
      ruleId,
      fileName,
      line: location.line + 1,
      column: location.character + 1,
      message,
      hint
    })
  }

// filterMap stays bounded by the comment array; per-comment recursion overflows large files.
const fileMatches = (context: RuleContext): ReadonlyArray<RuleMatch> => {
  const sourceFile = context.sourceFile
  const text = sourceFile.getFullText()
  const fileName =
    path.relative(context.projectRoot, sourceFile.fileName) ||
    sourceFile.fileName
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text
  )
  const tokens = Arr.unfold(scanner, scanNextToken)
  const blockPositions = tokens.filter(isMultiLineBlock(text)).map(tokenPos)
  const singleLineTokens = tokens.filter(isSingleLineComment)
  const adjacentRunPositions = Arr.filterMap(
    singleLineTokens,
    runStartPosition(sourceFile)(singleLineTokens)
  )
  const positions = blockPositions.concat(adjacentRunPositions)

  return positions.map(positionToMatch(sourceFile)(fileName))
}

const check = onFile(fileMatches)

const badExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `/*
 * Validates the user input and
 * returns the sanitized result.
 */
const validate = (input: string): string =>
  input.trim()`
})

const goodExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `// Strips whitespace to prevent injection via padded strings.
const validate = (input: string): string =>
  input.trim()`
})

const goodJsDocExample = new ExampleSnippet({
  filePath: "src/sanitize.ts",
  code: `/**
 * Strips leading and trailing whitespace before persistence.
 */
export const sanitize = (input: string): string =>
  input.trim()`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample, goodJsDocExample]
})

export const noMultiLineComments = new Rule({
  id: ruleId,
  description:
    "Disallow multi-line comments in favor of self-documenting code and ADRs for " +
    "architectural decisions; JSDoc documenting an exported API is permitted.",
  example,
  check
})
