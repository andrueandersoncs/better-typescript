import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("no-non-null-assertion reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-non-null-assertion")))
