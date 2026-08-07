import { test } from "bun:test"
import { assertAllowedFixtureItems } from "./assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "./assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./requireBlankLinesAroundMultilineDeclarationsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./requireBlankLinesAroundMultilineDeclarationsDisallowedFixtureItems.js"
import { runRequireBlankLinesAroundMultilineDeclarationsFixture } from "./requireBlankLinesAroundMultilineDeclarationsFixtureRunner.js"

test("require-blank-lines-around-multiline-declarations reports disallowed and permits allowed fixture items", async () => {
  const signals = await runRequireBlankLinesAroundMultilineDeclarationsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
