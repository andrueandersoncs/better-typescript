import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { boundarySchemaDecode } from "../index.js"

test("boundary-schema-decode has exact public Violation output", () =>
  assertRuleViolations(boundarySchemaDecode, import.meta.dir, "effect-quality", "expected.json"))
