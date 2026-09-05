import type { Effect } from "./Effect.js"

export interface Cache<Key, Value> {}

export declare const make: <Key, Value, E, R>(options: {
  readonly lookup: (key: Key) => Effect<Value, E, R>
}) => Effect<Cache<Key, Value>, never, R>

export declare const makeWith: <Key, Value, E, R>(
  lookup: (key: Key) => Effect<Value, E, R>,
  options: { readonly capacity: number }
) => Effect<Cache<Key, Value>, never, R>
