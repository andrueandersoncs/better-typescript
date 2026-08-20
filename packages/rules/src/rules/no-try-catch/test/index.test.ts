import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-try-catch reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-try-catch")))
