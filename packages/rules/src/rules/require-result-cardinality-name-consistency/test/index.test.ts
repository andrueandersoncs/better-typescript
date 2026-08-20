import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("require-result-cardinality-name-consistency reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("require-result-cardinality-name-consistency")))
