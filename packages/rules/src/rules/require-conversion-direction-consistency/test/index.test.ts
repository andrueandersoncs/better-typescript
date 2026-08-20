import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("require-conversion-direction-consistency reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("require-conversion-direction-consistency")))
