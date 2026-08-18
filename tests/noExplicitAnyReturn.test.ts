import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-explicit-any-return reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-explicit-any-return")))
