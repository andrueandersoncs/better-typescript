import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("prefer-hash-set reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-hash-set")))
