import { test } from "bun:test"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

test("no-monomorphic-struct-get reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("no-monomorphic-struct-get")))
