import { Context, Effect, Layer } from "effect"

export class Mode extends Context.Service<
  Mode,
  { readonly value: string }
>()("Mode") {}

export class Region extends Context.Service<
  Region,
  { readonly value: string }
>()("Region") {}

export const modeLive = Layer.effect(
  Mode,
  Effect.sync(() => {
    const choose = (production: boolean): string =>
      production ? "live" : "test"
    return { value: choose(true) }
  })
)

export const regionLive = Layer.succeed(Region, {
  value: ((region: string): string =>
    region.length === 0 ? "local" : region)("us-west")
})

export const appLayer = modeLive.pipe(Layer.provideMerge(regionLive))
