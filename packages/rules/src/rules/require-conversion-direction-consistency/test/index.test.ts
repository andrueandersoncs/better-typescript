import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("require-conversion-direction-consistency reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("require-conversion-direction-consistency")))
