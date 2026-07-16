import { Effect } from "effect"

export const runVoid = (): void => {
  Effect.runSync(Effect.void)
}
