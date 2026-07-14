import { Effect } from "effect"
import { loadOrder } from "./application/useCase.js"
import { orderLive } from "./adapters/orderLive.js"

Effect.runPromise(loadOrder("one").pipe(Effect.provide(orderLive)))
