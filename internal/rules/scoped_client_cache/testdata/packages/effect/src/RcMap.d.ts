import type { Effect } from "./Effect.js"

export declare const make: <Key, Value, E, R>(options: {
  readonly lookup: (key: Key) => Effect<Value, E, R>
}) => Effect<unknown, never, R>
