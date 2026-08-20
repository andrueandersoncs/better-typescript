import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { serviceMethodEffectFn } from "../index.js"

test("service-method-effect-fn has exact public Violation output", () =>
  assertRuleViolations(serviceMethodEffectFn, import.meta.dir, "effect-quality", "expected.json"))
