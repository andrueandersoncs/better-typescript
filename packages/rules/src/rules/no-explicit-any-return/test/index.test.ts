import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("no-explicit-any-return reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-explicit-any-return")))
