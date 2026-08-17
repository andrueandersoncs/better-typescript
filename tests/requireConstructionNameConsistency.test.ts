import { test } from "bun:test"
import { requireConstructionNameConsistency } from "@better-typescript/guidance/preset/semanticNamingPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("require-construction-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireConstructionNameConsistency))
