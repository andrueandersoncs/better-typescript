import { test } from "node:test"
import { preferDirectBooleanReturn } from "@better-typescript/guidance/policies/preferDirectBooleanReturn"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-direct-boolean-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferDirectBooleanReturn))
