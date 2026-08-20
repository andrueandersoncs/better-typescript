import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("prefer-specific-operation-names reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-specific-operation-names")))
