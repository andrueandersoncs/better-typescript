import { Array, Effect, HashSet, Iterable, Option, Ref, Tuple, pipe } from "effect"
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

const scanSourceComments = (sourceFile: ts.SourceFile): ReadonlyArray<SourceComment> => {
  const sourceText = sourceFile.getFullText()

  const scanner = ts.createScanner(
    sourceFile.languageVersion,
    false,
    sourceFile.languageVariant,
    sourceText
  )

  const tokens = Iterable.unfold<ts.Scanner, ts.Scanner>(scanner, (current) => {
    const kind = current.scan()

    if (kind === ts.SyntaxKind.EndOfFileToken) {
      return Option.none()
    }

    const entry = Tuple.make(current, current)

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
