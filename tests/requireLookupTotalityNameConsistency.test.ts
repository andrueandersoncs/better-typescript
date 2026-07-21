import { test } from "node:test"
import { requireLookupTotalityNameConsistency } from "@better-typescript/guidance/policies/requireLookupTotalityNameConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-lookup-totality-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireLookupTotalityNameConsistency))
