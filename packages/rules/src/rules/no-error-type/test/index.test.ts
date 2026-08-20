import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-error-type reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-error-type")))
