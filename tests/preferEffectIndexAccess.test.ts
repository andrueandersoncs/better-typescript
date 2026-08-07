import { test } from "bun:test"
import { preferEffectIndexAccess } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-index-access reports direct array and tuple indexing", () =>
  assertPolicyFixture(preferEffectIndexAccess))
