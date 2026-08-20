import { Effect } from "effect"

export function loadValue(): Effect.Effect<number> {
  return Effect.succeed(1)
}

export const fetchValue = (): Effect.Effect<number> => Effect.succeed(2)

export const computeValue = function (): Promise<number> {
  return Promise.resolve(3)
}

export class Service {
  start(): Effect.Effect<void> {
    return Effect.void
  }
}
