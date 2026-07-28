import { test } from "bun:test"
import { preferEffectIndexAccess } from "@better-typescript/guidance/policies/preferEffectIndexAccess"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-index-access reports direct array and tuple indexing", () =>
  assertPolicyFixture(preferEffectIndexAccess))
