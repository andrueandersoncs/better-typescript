import { test } from "bun:test"
import { requireCallableRoleNameConsistency } from "@better-typescript/guidance/preset/semanticNamingPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("require-callable-role-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireCallableRoleNameConsistency))
