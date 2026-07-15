import { Context, Effect, Layer, ManagedRuntime, Ref } from "effect"
import { DefaultPort } from "../ports/badPort.js"

export class RuntimeConfig extends Context.Service<
  RuntimeConfig,
  { readonly name: string }
>()("RuntimeConfig") {}

const program = Effect.gen(function* () {
  const config = yield* RuntimeConfig
  return config.name
})

export const running = Effect.runPromise(
  program.pipe(Effect.provideService(RuntimeConfig, { name: "direct" }))
)

export const provided = Effect.provide(
  program,
  Layer.succeed(RuntimeConfig, { name: "provided" })
)

export const captured = Effect.context<RuntimeConfig>()

export const readContext = (context: Context.Context<RuntimeConfig>): string =>
  Context.get(context, RuntimeConfig).name

export const sharedState = Ref.makeUnsafe(0)

export const callbackRun = Effect.runCallback(Effect.void)
export const defaultLayer = DefaultPort.Default

const managedRuntime = ManagedRuntime.make(
  Layer.succeed(RuntimeConfig, { name: "managed" })
)

export const managedRun = managedRuntime.runPromise(program)
