import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { layerForeverAcquisition } from "../index.js"

test("layer-forever-acquisition has exact public Violation output", () =>
  assertRuleViolations(layerForeverAcquisition, import.meta.dir, "effect-quality", "expected.json"))
