import { test } from "bun:test"
import { assertAllowedFixtureItems } from "./assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "./assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./noLongCommentsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./noLongCommentsDisallowedFixtureItems.js"
import { runNoLongCommentsFixture } from "./noLongCommentsFixtureRunner.js"

test("no-long-comments reports overlong comments and permits comments within the limit", async () => {
  const signals = await runNoLongCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
