import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("no-raw-object-types reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-raw-object-types")))
