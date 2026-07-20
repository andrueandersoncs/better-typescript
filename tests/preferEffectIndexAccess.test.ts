import { test } from "node:test"
import { preferEffectIndexAccess } from "@better-typescript/checks/preferEffectIndexAccess"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-index-access reports direct array and tuple indexing", () =>
  assertCheckFixture(preferEffectIndexAccess))
