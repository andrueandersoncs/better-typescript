import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-manual-type-dispatch reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-manual-type-dispatch")))
