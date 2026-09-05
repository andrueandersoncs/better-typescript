import type { Effect } from "../Effect.js"

export declare const adjust: (duration: number) => Effect<void>
export declare const setTime: (timestamp: number) => Effect<void>
export declare const withLive: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
