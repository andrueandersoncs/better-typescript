import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("prefer-hash-map reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-hash-map")))
