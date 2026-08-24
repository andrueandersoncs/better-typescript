import { Effect } from "effect";
declare const decode: (value: string) => Effect.Effect<string>;
export const bad = Effect.fn("bad")(function* (value: string) { return yield* decode(value) });
export const clean = Effect.fn("clean")(function* (value: string) { return yield* decode(value.trim()) });
