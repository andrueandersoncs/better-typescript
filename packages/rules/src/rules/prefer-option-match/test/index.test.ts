import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("prefer-option-match reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-option-match")))
