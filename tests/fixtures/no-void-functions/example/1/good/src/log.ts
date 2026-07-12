import { Effect } from "effect"

export const logMessage = (msg: string) => Effect.sync(() => console.log(msg))
