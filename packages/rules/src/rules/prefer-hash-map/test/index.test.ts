import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("prefer-hash-map reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-hash-map")))
