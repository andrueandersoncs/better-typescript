import { Cache, Effect } from "effect"
declare const clientLayer: unknown
const client = Effect.provide(Effect.succeed("client"), clientLayer)
const cache = Cache.make({ capacity: 10, timeToLive: "1 minute", lookup: (key: string) => Effect.succeed(key) })
