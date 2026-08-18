import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("prefer-effect-record-filter-map reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-effect-record-filter-map")))
