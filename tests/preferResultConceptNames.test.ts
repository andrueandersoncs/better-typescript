import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("prefer-result-concept-names reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-result-concept-names")))
