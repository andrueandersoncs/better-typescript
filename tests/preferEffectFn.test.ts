import { test } from "node:test"
import { preferEffectFn } from "@better-typescript/guidance/policies/preferEffectFn"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-fn reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectFn))
