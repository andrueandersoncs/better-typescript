import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-inline-boolean-expressions reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-inline-boolean-expressions")))
