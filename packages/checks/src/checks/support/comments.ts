import { Array, Effect, HashSet, Iterable, Match, Option, Ref, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { LatestCacheEntry, SourceComment } from "./commentsData.js"

const memoizeLatest = <Key extends object, Value>(load: (key: Key) => Value) => {
  const emptyCache = Option.none<LatestCacheEntry<Key, Value>>()
  const cache = Ref.makeUnsafe(emptyCache)

  const memoized = (key: Key): Value => {
    const readOrLoad = (
      cached: Option.Option<LatestCacheEntry<Key, Value>>
    ): readonly [Value, Option.Option<LatestCacheEntry<Key, Value>>] => {
      const current = pipe(
        cached,
        Option.filter((entry) => entry.key === key)
      )

      if (Option.isSome(current)) {
        const value = current.value.value

        return Tuple.make(value, cached)
      }

      const value = load(key)
      const entry = new LatestCacheEntry({ key, value })
      const updated = Option.some(entry)

      return Tuple.make(value, updated)
    }

    const cachedValue = Ref.modify(cache, readOrLoad)

    return Effect.runSync(cachedValue)
  }

  return memoized
}

const commentSyntaxKinds = HashSet.make(
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia
)

const isCommentToken = (scanner: ts.Scanner): boolean => {
  const kind = scanner.getToken()

  return HashSet.has(commentSyntaxKinds, kind)
}

const sourceCommentFrom = (scanner: ts.Scanner): SourceComment => {
  const kind = scanner.getToken()
  const pos = scanner.getTokenStart()
  const end = scanner.getTokenEnd()

  return new SourceComment({ kind, pos, end })
}

// ScanContext names the two close-brace owners because rescanning must know which one it closes.
type ScanContext = "template" | "brace"

const templateContext: ScanContext = "template"
const braceContext: ScanContext = "brace"

const emptyScanContexts: ReadonlyArray<ScanContext> = Array.empty()

// A slash after these kinds is division because they end an expression; elsewhere it is a regex.
const expressionEndKinds = HashSet.make(
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PrivateIdentifier,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.ThisKeyword,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.SuperKeyword,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken
)

const triviaKinds = HashSet.make(
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
  ts.SyntaxKind.WhitespaceTrivia,
  ts.SyntaxKind.NewLineTrivia,
  ts.SyntaxKind.ShebangTrivia
)

const slashKinds = HashSet.make(ts.SyntaxKind.SlashToken, ts.SyntaxKind.SlashEqualsToken)

const closeBraceKind = (
  scanner: ts.Scanner,
  contexts: ReadonlyArray<ScanContext>
): readonly [ts.SyntaxKind, ReadonlyArray<ScanContext>] => {
  const head = Array.head(contexts)
  const rest = Array.drop(contexts, 1)
  const closesBrace = Option.contains(head, braceContext)
  const closesTemplateSubstitution = Option.contains(head, templateContext)

  if (closesBrace) {
    return Tuple.make(ts.SyntaxKind.CloseBraceToken, rest)
  }

  if (closesTemplateSubstitution) {
    const templateKind = scanner.reScanTemplateToken(false)
    const staysInTemplate = templateKind === ts.SyntaxKind.TemplateMiddle

    return Tuple.make(templateKind, staysInTemplate ? contexts : rest)
  }

  return Tuple.make(ts.SyntaxKind.CloseBraceToken, contexts)
}

// The parser normally drives these rescans because raw scans mis-lex template tails and regexes.
const rescannedKind =
  (scanner: ts.Scanner, contexts: ReadonlyArray<ScanContext>, previous: ts.SyntaxKind) =>
  (kind: ts.SyntaxKind): readonly [ts.SyntaxKind, ReadonlyArray<ScanContext>] => {
    const pushedTemplate: ReadonlyArray<ScanContext> = Array.prepend(contexts, templateContext)
    const pushedBrace: ReadonlyArray<ScanContext> = Array.prepend(contexts, braceContext)

    return pipe(
      Match.value(kind),
      Match.when(ts.SyntaxKind.TemplateHead, () => Tuple.make(kind, pushedTemplate)),
      Match.when(ts.SyntaxKind.OpenBraceToken, () => Tuple.make(kind, pushedBrace)),
      Match.when(ts.SyntaxKind.CloseBraceToken, () => closeBraceKind(scanner, contexts)),
      Match.orElse(() => {
        const isSlash = HashSet.has(slashKinds, kind)
        const inRegexPosition = !HashSet.has(expressionEndKinds, previous)
        const rescansAsRegex = isSlash && inRegexPosition

        if (rescansAsRegex) {
          const slashKind = scanner.reScanSlashToken()

          return Tuple.make(slashKind, contexts)
        }

        return Tuple.make(kind, contexts)
      })
    )
  }

const initialScanState: readonly [ReadonlyArray<ScanContext>, ts.SyntaxKind] = Tuple.make(
  emptyScanContexts,
  ts.SyntaxKind.Unknown
)

const scanSourceComments = (sourceFile: ts.SourceFile): ReadonlyArray<SourceComment> => {
  const sourceText = sourceFile.getFullText()

  const scanner = ts.createScanner(
    sourceFile.languageVersion,
    false,
    sourceFile.languageVariant,
    sourceText
  )

  const tokens = Iterable.unfold(initialScanState, (state) => {
    const [contexts, previous] = state
    const kind = scanner.scan()

    if (kind === ts.SyntaxKind.EndOfFileToken) {
      return Option.none()
    }

    const rescan = rescannedKind(scanner, contexts, previous)
    const [effectiveKind, nextContexts] = rescan(kind)
    const isTrivia = HashSet.has(triviaKinds, effectiveKind)
    const nextPrevious = isTrivia ? previous : effectiveKind
    const nextState = Tuple.make(nextContexts, nextPrevious)
    const entry = Tuple.make(scanner, nextState)

    return Option.some(entry)
  })

  return pipe(
    tokens,
    Iterable.filter(isCommentToken),
    Iterable.map(sourceCommentFrom),
    Array.fromIterable
  )
}

export const sourceComments: (sourceFile: ts.SourceFile) => ReadonlyArray<SourceComment> =
  memoizeLatest(scanSourceComments)

export const commentText =
  (text: string) =>
  (comment: SourceComment): string =>
    text.slice(comment.pos, comment.end)

export const isSingleLineComment = (comment: SourceComment): boolean =>
  comment.kind === ts.SyntaxKind.SingleLineCommentTrivia

export const onlyBlankBetween =
  (text: string) =>
  (a: SourceComment) =>
  (b: SourceComment): boolean =>
    text.slice(a.end, b.pos).trim().length === 0
