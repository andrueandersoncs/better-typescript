import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("prefer-effect-array-append-all reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-effect-array-append-all")))
