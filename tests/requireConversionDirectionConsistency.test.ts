import { test } from "bun:test"
import { requireConversionDirectionConsistency } from "@better-typescript/guidance/preset/semanticNamingPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("require-conversion-direction-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireConversionDirectionConsistency))
