import { Effect } from "effect"
import { expected } from "./assertions.js"

export const assertExpected = (value: string): string => expected(value)

export const helperReady: boolean = Effect.runSync(Effect.succeed(true))
