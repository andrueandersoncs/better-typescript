import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-first-party-schema-declare reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-first-party-schema-declare")))
