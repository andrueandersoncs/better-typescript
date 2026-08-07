import { test } from "bun:test"
import { assertAllowedFixtureItems } from "./assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "./assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./noBlankLinesBetweenSingleLineDeclarationsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./noBlankLinesBetweenSingleLineDeclarationsDisallowedFixtureItems.js"
import { runNoBlankLinesBetweenSingleLineDeclarationsFixture } from "./noBlankLinesBetweenSingleLineDeclarationsFixtureRunner.js"

test("no-blank-lines-between-single-line-declarations reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoBlankLinesBetweenSingleLineDeclarationsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
