import { Cache, Effect } from "effect"
declare const clientLayer: unknown
const cache = Cache.make({ capacity: 10, timeToLive: "1 minute", lookup: (key: string) => Effect.provide(Effect.succeed(key), clientLayer) })
