import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-multiple-boolean-operators reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-multiple-boolean-operators")))
