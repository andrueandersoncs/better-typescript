import { Data } from "effect"
import type * as ts from "typescript"

// SourceComment is one comment-token contract because its owners must agree on one shape.
export class SourceComment extends Data.Class<{
  readonly kind: ts.SyntaxKind
  readonly pos: number
  readonly end: number
}> {}

// LatestCacheEntry is the memoized pair because both owners read one cached shape.
export class LatestCacheEntry<Key, Value> extends Data.Class<{
  readonly key: Key
  readonly value: Value
}> {}
