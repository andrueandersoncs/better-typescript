import { test } from "bun:test"
import { preferEffectArrayAppendAll } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-array-append-all reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectArrayAppendAll))
