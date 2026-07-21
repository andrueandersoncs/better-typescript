import { test } from "node:test"
import { preferEffectPropertyAccessors } from "@better-typescript/guidance/policies/preferEffectPropertyAccessors"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-property-accessors reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectPropertyAccessors))
