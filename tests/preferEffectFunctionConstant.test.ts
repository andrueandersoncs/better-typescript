import { test } from "node:test"
import { preferEffectFunctionConstant } from "@better-typescript/guidance/policies/preferEffectFunctionConstant"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-function-constant reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectFunctionConstant))
