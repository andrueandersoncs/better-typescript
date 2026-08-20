import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("prefer-inferred-types reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-inferred-types")))
