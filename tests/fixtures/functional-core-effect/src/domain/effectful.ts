import { Effect } from "effect"

export const normalizeEffect = (input: string): Effect.Effect<string> =>
  Effect.succeed(input.trim())

export const later = (input: string): Promise<string> => Promise.resolve(input)

export const asyncLater = async (input: string) => input
