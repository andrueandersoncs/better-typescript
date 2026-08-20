import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-pass-through-object-wrappers reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-pass-through-object-wrappers")))
