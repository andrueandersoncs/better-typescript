import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-non-null-assertion reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-non-null-assertion")))
