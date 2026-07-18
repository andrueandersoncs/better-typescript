import { Cache, Config, Context, Effect, Layer, Queue, Schedule, Schema, Stream } from "effect"

declare const database: { readonly query: () => Promise<void> }

export namespace Legacy {
  export const value = 1
}

export const unchecked = 1 as any

export class ClassModel extends Schema.Class<ClassModel>("ClassModel")({
  id: Schema.String
}) {}

export const User = Schema.Struct({
  email: Schema.optional(Schema.String)
})

export interface Input {
  email?: string
}

export const InputSchema = Schema.Struct({
  email: Schema.optional(Schema.String)
})

export class AppError extends Error {
  readonly _tag = "AppError"
}

export const port = Config.string("APP_PORT")
export const apiKeyReference = Context.Reference("API_TOKEN", { defaultValue: () => "" })


export const apiToken = Config.string("API_TOKEN")

export class UserService extends Context.Service<
  UserService,
  { readonly get: () => Effect.Effect<string> }
>()("UserService") {}

export const unnamed = Effect.fn(function* () {
  return yield* Effect.succeed("value")
})

export const malformedName = Effect.fn("UserService")(function* () {
  return yield* Effect.succeed("value")
})

export const usesEnvironment = process.env.API_TOKEN
export const applicationFetch = fetch("https://example.test")
export const parsedPayload = JSON.parse("{}")
export const userHandler = () => database.query()
export const mergedLayers = Layer.mergeAll(Layer.empty, Layer.empty)
export const transaction = () => fetch("https://example.test")
// @ts-expect-error Fixture targets Effect.forkDaemon advice across Effect versions.
export const background = Effect.forkDaemon(Effect.void)
export const saveUser = () => Effect.retry(Effect.void, Schedule.recurs(1))
export const silentWorker = Effect.ignore(Effect.fail("failed"))
export const foreverLayerAdvice = Layer.effectDiscard(Effect.forever(Effect.void))
export const paginatePages = () => {
  let pageToken: string | undefined = "first"
  const pages: Array<string> = []
  while (pageToken !== undefined) {
    pages.push(pageToken)
    pageToken = undefined
  }
  return pages
}
export const workQueue = Queue.unbounded<string>()


export const worker = Effect.gen(function* () {
  while (true) {
    yield* Effect.sleep("1 second")
  }
})

export const collect = Stream.runCollect(Stream.never)
export const buffer = Stream.buffer({ capacity: "unbounded" })

export const manualCache = () => {
  const expiresAt = Date.now()
  const values = new Map<string, { expiresAt: number; value: string }>()
  const item = values.get("user")
  if (item !== undefined && item.expiresAt < Date.now()) {
    values.delete("user")
  }
  return values
}
function completeTtlCache() {
  const expiresAt = Date.now()
  const cache = new Map<string, { value: string; expiresAt: number }>()
  cache.set("user", { value: "user", expiresAt })
  if (expiresAt < Date.now()) cache.delete("user")
  return cache
}

export const inflight = new Map<string, Promise<string>>()

export const requestCache = (_request: Request) =>
  Cache.make({
    capacity: 10,
    timeToLive: "1 minute",
    lookup: () => Effect.succeed("value")
  })

export const cacheWithClient = Cache.make({
  capacity: 10,
  timeToLive: "1 minute",
  lookup: () => Layer.build(Layer.empty)
})
export const exponentialRetry = Effect.retry(Effect.void, Schedule.exponential("1 second"))

export const broadRecovery = Effect.fail("failed").pipe(
  Effect.catchCause(() => Effect.void)
)
// @ts-expect-error Fixture targets Effect.catchAll advice across Effect versions.
export const rawBoundaryRecovery = Effect.catchAll(Effect.fail("failed"), () => {
  throw new Error("fallback")
})

export const foreverLayer = Layer.effectDiscard(Stream.never.pipe(Stream.runDrain))

export const foreverRetry = Effect.retry(Effect.void, Schedule.forever)
