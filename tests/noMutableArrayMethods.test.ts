import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-mutable-array-methods reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-mutable-array-methods")))
