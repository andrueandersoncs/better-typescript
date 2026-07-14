import { Data } from "effect"
import type * as ts from "typescript"

/**
 * SourceComment is the shared SourceComment values contract used by
 * isSingleLineComment, sourceComments, and sourceCommentFrom.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class SourceComment extends Data.Class<{
  readonly kind: ts.SyntaxKind
  readonly pos: number
  readonly end: number
}> {}

/**
 * LatestCacheEntry is the shared key, value contract used by memoizeLatest.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class LatestCacheEntry<Key, Value> extends Data.Class<{
  readonly key: Key
  readonly value: Value
}> {}
