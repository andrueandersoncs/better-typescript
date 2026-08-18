import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-mutable-variable-declarations reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-mutable-variable-declarations")))
