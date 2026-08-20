import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-for-in-loops reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-for-in-loops")))
