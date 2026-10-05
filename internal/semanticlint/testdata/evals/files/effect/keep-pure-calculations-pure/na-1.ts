import * as Effect from "effect/Effect"

type Request = {
  readonly url: string
}

type Response = {
  readonly status: number
  readonly body: string
}

export const send = (request: Request): Effect.Effect<Response, Error> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(request.url)
      return { status: response.status, body: await response.text() }
    },
    catch: (cause) => new Error(String(cause))
  })
