import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("prefer-curried-data-last-functions reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-curried-data-last-functions")))
