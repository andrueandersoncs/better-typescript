import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-manual-type-dispatch reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-manual-type-dispatch")))
