import { test } from "node:test"
import { requireResultCardinalityNameConsistency } from "@better-typescript/guidance/policies/requireResultCardinalityNameConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-result-cardinality-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireResultCardinalityNameConsistency))
