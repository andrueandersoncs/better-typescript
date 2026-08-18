import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-function-keyword reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-function-keyword")))
