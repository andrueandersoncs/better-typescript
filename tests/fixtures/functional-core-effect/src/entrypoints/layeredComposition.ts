import { Context, Effect, Layer } from "effect"

export class Mode extends Context.Tag("Mode")<
  Mode,
  { readonly value: string }
>() {}

export class Region extends Context.Tag("Region")<
  Region,
  { readonly value: string }
>() {}

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
