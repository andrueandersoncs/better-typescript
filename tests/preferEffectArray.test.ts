import { test } from "node:test"
import { preferEffectArray } from "@better-typescript/guidance/policies/preferEffectArray"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-array reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectArray))
