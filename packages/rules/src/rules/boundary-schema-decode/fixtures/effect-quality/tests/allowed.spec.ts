import { Effect } from "effect"
import { it } from "@effect/vitest"

it.effect("runs an Effect", () => Effect.succeed("value"))
