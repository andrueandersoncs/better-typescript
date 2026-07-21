import { test } from "node:test"
import { requireCallableRoleNameConsistency } from "@better-typescript/guidance/policies/requireCallableRoleNameConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-callable-role-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireCallableRoleNameConsistency))
