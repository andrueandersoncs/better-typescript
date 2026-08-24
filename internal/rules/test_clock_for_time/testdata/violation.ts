import { Effect } from "effect"
import { it } from "@effect/vitest"
it.effect("waits", () => Effect.sleep("1 second"))
