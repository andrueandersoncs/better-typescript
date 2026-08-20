import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { layerForeverAcquisition } from "../index.js"

test("layer-forever-acquisition has exact public Violation output", () =>
  assertRuleViolations(layerForeverAcquisition, import.meta.dir, "effect-quality", "expected.json"))
