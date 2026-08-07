import { test } from "bun:test"
import { assertAllowedFixtureItems } from "./assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "./assertDisallowedFixtureItems.js"
import { allowedFixtureItems } from "./noMultiLineCommentsAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./noMultiLineCommentsDisallowedFixtureItems.js"
import { runNoMultiLineCommentsFixture } from "./noMultiLineCommentsFixtureRunner.js"

test("no-multi-line-comments reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoMultiLineCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
