import { test } from "node:test"
import { preferSpecificOperationNames } from "@better-typescript/guidance/policies/preferSpecificOperationNames"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-specific-operation-names reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferSpecificOperationNames))
