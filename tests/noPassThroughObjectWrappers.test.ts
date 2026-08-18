import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-pass-through-object-wrappers reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-pass-through-object-wrappers")))
