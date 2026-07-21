import { test } from "node:test"
import { requireConstructionNameConsistency } from "@better-typescript/guidance/policies/requireConstructionNameConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-construction-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireConstructionNameConsistency))
