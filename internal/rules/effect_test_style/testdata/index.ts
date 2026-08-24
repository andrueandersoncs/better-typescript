import { it } from "@effect/vitest"
declare namespace Effect { type Effect<A> = { readonly value: A }; function succeed<A>(value: A): Effect<A> }
it("bad", () => Effect.succeed(1))
it.effect("good", () => Effect.succeed(1))
