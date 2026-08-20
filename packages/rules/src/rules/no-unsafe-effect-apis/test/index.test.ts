import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-unsafe-effect-apis reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-unsafe-effect-apis")))
