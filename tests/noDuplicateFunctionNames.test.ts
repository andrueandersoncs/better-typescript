import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-duplicate-function-names reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-duplicate-function-names")))
