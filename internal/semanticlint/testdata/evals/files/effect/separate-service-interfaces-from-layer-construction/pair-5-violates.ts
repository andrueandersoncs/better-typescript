import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

type Notice = { readonly recipient: string; readonly body: string }

interface Transport {
  readonly send: (notice: Notice) => Effect.Effect<void>
}

export const Dispatch = Context.Service<{
  readonly publish: (notice: Notice) => Effect.Effect<void>
}>("Dispatch")

export const DispatchLive = Layer.succeed(Dispatch, {
  publish: (notice: Notice) => Effect.gen(function*() {
    const transport = yield* Context.Service<Transport>("Transport")
    return yield* transport.send(notice)
  })
})
