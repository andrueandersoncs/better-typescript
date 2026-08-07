import { test } from "bun:test"
import { preferEffectPropertyAccessors } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-property-accessors reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectPropertyAccessors))
