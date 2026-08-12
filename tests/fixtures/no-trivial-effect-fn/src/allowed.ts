import { Effect } from "effect"

declare const decode: (source: string) => Effect.Effect<string>

export const normalizeSource = Effect.fn("Source.normalize")(function* (source: string) {
  return yield* decode(source).pipe(Effect.map((value) => value.trim()))
})


const trimResult = (effect: Effect.Effect<string>) => effect.pipe(Effect.map((value) => value.trim()))

export const transformedSource = Effect.fn("Source.transformed")(
  function* (source: string) {
    return yield* decode(source)
  },
  trimResult
)

export const directSource = Effect.fn("Source.direct")(function (source: string) {
  return decode(source)
})


import { Context, Layer } from "effect"

class SourceDecoder extends Context.Service<
  SourceDecoder,
  { readonly decodeSource: (source: string) => Effect.Effect<string> }
>()("SourceDecoder") {}

const serviceDecodeSource = Effect.fn("SourceDecoder.decodeSource")(function* (source: string) {
  return yield* decode(source)
})

export const sourceDecoderLayer = Layer.succeed(
  SourceDecoder,
  SourceDecoder.of({ decodeSource: serviceDecodeSource })
)

const ValueSourceDecoder = Context.Service<{
  readonly decodeSource: (source: string) => Effect.Effect<string>
}>("ValueSourceDecoder")

const valueServiceDecodeSource = Effect.fn("ValueSourceDecoder.decodeSource")(function* (
  source: string
) {
  return yield* decode(source)
})

export const valueSourceDecoderLayer = Layer.succeed(ValueSourceDecoder, {
  decodeSource: valueServiceDecodeSource
})

const CurriedSourceDecoder = Context.Service<{
  readonly decodeSource: (source: string) => Effect.Effect<string>
}>("CurriedSourceDecoder")

const curriedServiceDecodeSource = Effect.fn("CurriedSourceDecoder.decodeSource")(function* (
  source: string
) {
  return yield* decode(source)
})

export const curriedSourceDecoderLayer = Layer.succeed(CurriedSourceDecoder)({
  decodeSource: curriedServiceDecodeSource
})
