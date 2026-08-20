import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-trivial-effect-fn reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-trivial-effect-fn")))
