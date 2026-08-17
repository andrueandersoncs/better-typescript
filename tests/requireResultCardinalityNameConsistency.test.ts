import { test } from "bun:test"
import { requireResultCardinalityNameConsistency } from "@better-typescript/guidance/preset/semanticNamingPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("require-result-cardinality-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireResultCardinalityNameConsistency))
