import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-explicit-any-return reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-explicit-any-return")))
