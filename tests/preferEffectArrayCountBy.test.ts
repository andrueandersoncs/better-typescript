import { test } from "node:test"
import { preferEffectArrayCountBy } from "@better-typescript/guidance/policies/preferEffectArrayCountBy"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-array-count-by reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectArrayCountBy))
