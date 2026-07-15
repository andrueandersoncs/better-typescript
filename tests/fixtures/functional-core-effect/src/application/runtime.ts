import { Context, Effect, Latch, Layer, ManagedRuntime, Ref } from "effect"
import { runMain } from "@effect/platform-browser/BrowserRuntime"
import { DefaultPort } from "../ports/badPort.js"

export class RuntimeConfig extends Context.Service<
  RuntimeConfig,
  { readonly name: string }
>()("RuntimeConfig") {}

const LogLevel = Context.Reference<"info" | "debug">("LogLevel", {
  defaultValue: () => "info" as const
})

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

export const providedContext = Effect.provideContext(
  program,
  Context.make(RuntimeConfig, { name: "context" })
)

export const runWith = Effect.runPromiseWith(Context.empty())(Effect.void)

export const pipeRun = Effect.void.pipe(Effect.runSync)

export const captured = Effect.context<RuntimeConfig>()

export const readContext = (context: Context.Context<RuntimeConfig>): string =>
  Context.getUnsafe(context, RuntimeConfig).name

export const referenceOverride = Effect.provideService(
  Effect.succeed("ok"),
  LogLevel,
  "debug"
)

export const sharedState = Ref.makeUnsafe(0)

export const latchState = Latch.makeUnsafe(false)

export const callbackRun = Effect.runCallback(Effect.void)
export const defaultLayer = DefaultPort.layer

const managedRuntime = ManagedRuntime.make(
  Layer.succeed(RuntimeConfig, { name: "managed" })
)

export const managedRun = managedRuntime.runPromise(program)

export const browserMain = runMain(Effect.void)

export const pipedReferenceOverride = Effect.succeed("ok").pipe(
  Effect.provideService(LogLevel, "debug")
)
