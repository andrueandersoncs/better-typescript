import { test } from "bun:test"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"

test("process-environment reports production reads and permits roots and tests", () =>
  assertRuleFixture(ruleNamed("process-environment")))
