import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("prefer-hash-set reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-hash-set")))
