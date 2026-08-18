import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("no-non-null-assertion reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-non-null-assertion")))
