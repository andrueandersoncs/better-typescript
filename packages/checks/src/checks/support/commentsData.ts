import { Data } from "effect"
import type * as ts from "typescript"

export class SourceComment extends Data.Class<{
  readonly kind: ts.SyntaxKind
  readonly pos: number
  readonly end: number
}> {}

export class LatestCacheEntry<Key, Value> extends Data.Class<{
  readonly key: Key
  readonly value: Value
}> {}
