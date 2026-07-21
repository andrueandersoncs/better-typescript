import { test } from "node:test"
import { requireResultShapeNameConsistency } from "@better-typescript/guidance/policies/requireResultShapeNameConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-result-shape-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireResultShapeNameConsistency))
