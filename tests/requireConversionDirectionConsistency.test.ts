import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("require-conversion-direction-consistency reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("require-conversion-direction-consistency")))
