import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { speculativeExport } from "../index.js"

test("speculative-export has exact public Violation output", () =>
  assertRuleViolations(speculativeExport, import.meta.dir, "concept", "expected.json"))
