import { test } from "bun:test"
import { assertAllowedFixtureItems } from "../../../../../../tests/assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "../../../../../../tests/assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./requireBecauseInCommentsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./requireBecauseInCommentsDisallowedFixtureItems.js"
import { runRequireBecauseInCommentsFixture } from "./requireBecauseInCommentsFixtureRunner.js"

test("require-because-in-comments reports every comment without because", async () => {
  const violations = await runRequireBecauseInCommentsFixture()

  assertDisallowedFixtureItems(violations, disallowedFixtureItems)
  assertAllowedFixtureItems(violations, allowedFixtureItems)
})
