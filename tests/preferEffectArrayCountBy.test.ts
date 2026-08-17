import { test } from "bun:test"
import { preferEffectArrayCountBy } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-array-count-by reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectArrayCountBy))
