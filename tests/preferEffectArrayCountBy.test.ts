import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("prefer-effect-array-count-by reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-effect-array-count-by")))
