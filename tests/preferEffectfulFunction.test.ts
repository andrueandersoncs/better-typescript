import { test } from "bun:test"
import { preferEffectfulFunction } from "@better-typescript/guidance/policies/preferEffectfulFunction"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effectful-function reports synchronous Effect wrappers and permits boundaries", () =>
  assertPolicyFixture(preferEffectfulFunction))
