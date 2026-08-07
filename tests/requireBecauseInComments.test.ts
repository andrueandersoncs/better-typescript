import { test } from "bun:test"
import { assertAllowedFixtureItems } from "./assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "./assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./requireBecauseInCommentsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./requireBecauseInCommentsDisallowedFixtureItems.js"
import { runRequireBecauseInCommentsFixture } from "./requireBecauseInCommentsFixtureRunner.js"

test("require-because-in-comments reports every comment without because", async () => {
  const signals = await runRequireBecauseInCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
