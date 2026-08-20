import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { effectFnName } from "../index.js"

test("effect-fn-name has exact public Violation output", () =>
  assertRuleViolations(effectFnName, import.meta.dir, "effect-quality", "expected.json"))
