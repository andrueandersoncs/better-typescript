import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { observableWorkerFailure } from "../index.js"

test("observable-worker-failure has exact public Violation output", () =>
  assertRuleViolations(observableWorkerFailure, import.meta.dir, "effect-quality", "expected.json"))
