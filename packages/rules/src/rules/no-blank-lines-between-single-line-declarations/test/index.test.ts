import { test } from "bun:test"
import { assertAllowedFixtureItems } from "../../../../../../tests/assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "../../../../../../tests/assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./noBlankLinesBetweenSingleLineDeclarationsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./noBlankLinesBetweenSingleLineDeclarationsDisallowedFixtureItems.js"
import { runNoBlankLinesBetweenSingleLineDeclarationsFixture } from "./noBlankLinesBetweenSingleLineDeclarationsFixtureRunner.js"

test("no-blank-lines-between-single-line-declarations reports disallowed and permits allowed fixture items", async () => {
  const violations = await runNoBlankLinesBetweenSingleLineDeclarationsFixture()

  assertDisallowedFixtureItems(violations, disallowedFixtureItems)
  assertAllowedFixtureItems(violations, allowedFixtureItems)
})
