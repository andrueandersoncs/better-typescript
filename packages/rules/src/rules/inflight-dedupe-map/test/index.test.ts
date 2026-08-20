import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { inflightDedupeMap } from "../index.js"

test("inflight-dedupe-map has exact public Violation output", () =>
  assertRuleViolations(inflightDedupeMap, import.meta.dir, "effect-quality", "expected.json"))
