import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("prefer-effect-array-append-all reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-effect-array-append-all")))
