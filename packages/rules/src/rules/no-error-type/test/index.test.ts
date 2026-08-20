import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("no-error-type reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-error-type")))
