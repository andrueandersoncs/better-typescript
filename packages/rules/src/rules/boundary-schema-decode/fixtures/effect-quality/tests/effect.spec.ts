import { Effect } from "effect"
import { it } from "@effect/vitest"

process.env.API_TOKEN = "test"

it("sleeps", () => Effect.sleep("1 second"))

it("runs an Effect", () => Effect.succeed("value"))
it.live("runs live", () => Effect.succeed("value"))
