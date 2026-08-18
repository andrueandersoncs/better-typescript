import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-for-in-loops reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-for-in-loops")))
