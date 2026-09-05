import { Effect as Fx } from "effect"
type Failure = { readonly _tag: "Failure" }
declare const operation: Fx.Effect<string, Failure>
Fx.catchCause(operation, () => Fx.succeed("fallback"))
type IO = Fx.Effect<string, Failure>
declare const aliased: IO
Fx.catchCause(aliased, () => Fx.succeed("fallback"))

const local = { catchCause: (_value: unknown, _handler: unknown) => undefined }
local.catchCause(operation, () => Fx.succeed("not an Effect recovery"))
