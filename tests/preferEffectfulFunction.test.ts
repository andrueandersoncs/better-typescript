import { test } from "bun:test"
import { preferEffectfulFunction } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effectful-function reports synchronous Effect wrappers and permits boundaries", () =>
  assertPolicyFixture(preferEffectfulFunction))
