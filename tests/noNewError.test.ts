import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-new-error reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-new-error")))
