import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("prefer-pipe-function reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-pipe-function")))
