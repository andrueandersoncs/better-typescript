import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("prefer-effect-record-filter-map reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-effect-record-filter-map")))
