import { test } from "node:test"
import { requireCallableRoleNameConsistency } from "@better-typescript/checks/requireCallableRoleNameConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-callable-role-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requireCallableRoleNameConsistency))
