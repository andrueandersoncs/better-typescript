import { test } from "node:test"
import { preferEffectPropertyAccessors } from "@better-typescript/checks/preferEffectPropertyAccessors"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-property-accessors reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectPropertyAccessors))
