import { Effect as Fx, Stream as S } from "effect"
type Failure = { readonly _tag: "Failure" }
declare const operation: Fx.Effect<string, Failure>
declare const neverFails: Fx.Effect<string, never>
declare const stream: S.Stream<string, Failure>

Fx.catchCause(neverFails, () => Fx.succeed("fallback"))
Fx.catchCause(operation, (cause) => Fx.failCause(cause))
Fx.catchCause(operation, (cause) => { return Fx.failCause(cause) })
Fx.catchCause(operation, (cause) => Fx.andThen(Fx.logError(cause), Fx.failCause(cause)))
S.catchCause(stream, (cause) => S.failCause(cause))
