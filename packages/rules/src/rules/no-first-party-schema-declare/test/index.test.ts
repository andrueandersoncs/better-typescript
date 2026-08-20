import { test } from "bun:test"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("no-first-party-schema-declare reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-first-party-schema-declare")))
