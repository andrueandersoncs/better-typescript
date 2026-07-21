import { test } from "node:test"
import { requirePredicateNameConsistency } from "@better-typescript/guidance/policies/requirePredicateNameConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-predicate-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requirePredicateNameConsistency))
