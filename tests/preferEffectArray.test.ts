import { test } from "bun:test"
import { preferEffectArray } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-array reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectArray))
