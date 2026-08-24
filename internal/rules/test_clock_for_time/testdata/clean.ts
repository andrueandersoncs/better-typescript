import { Effect } from "effect"
import { it } from "@effect/vitest"
import { TestClock } from "effect/testing"
it.effect("waits", () => Effect.zipRight(Effect.sleep("1 second"), TestClock.adjust("1 second")))
