import { test } from "node:test"
import { requireCommandNameConsistency } from "@better-typescript/guidance/policies/requireCommandNameConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-command-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireCommandNameConsistency))
