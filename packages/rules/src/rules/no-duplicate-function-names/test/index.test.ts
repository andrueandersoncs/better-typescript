import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-duplicate-function-names reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-duplicate-function-names")))
