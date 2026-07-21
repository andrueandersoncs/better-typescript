import { test } from "node:test"
import { preferConditionalReturn } from "@better-typescript/guidance/policies/preferConditionalReturn"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-conditional-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferConditionalReturn))
