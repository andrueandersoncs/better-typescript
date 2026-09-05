import { Effect } from "effect"

export const Clock = {
  adjust: (duration: number): Effect.Effect<void> => Effect.sleep(duration)
}
