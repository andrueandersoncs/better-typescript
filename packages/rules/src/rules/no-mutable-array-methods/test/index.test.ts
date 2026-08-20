import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-mutable-array-methods reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-mutable-array-methods")))
