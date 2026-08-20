import { test } from "bun:test"
import { assertAllowedFixtureItems } from "../../../../test/assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "../../../../test/assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./requireBlankLinesAroundMultilineDeclarationsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./requireBlankLinesAroundMultilineDeclarationsDisallowedFixtureItems.js"
import { runRequireBlankLinesAroundMultilineDeclarationsFixture } from "./requireBlankLinesAroundMultilineDeclarationsFixtureRunner.js"

test("require-blank-lines-around-multiline-declarations reports disallowed and permits allowed fixture items", async () => {
  const violations = await runRequireBlankLinesAroundMultilineDeclarationsFixture()

  assertDisallowedFixtureItems(violations, disallowedFixtureItems)
  assertAllowedFixtureItems(violations, allowedFixtureItems)
})
