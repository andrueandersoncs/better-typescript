import { test } from "bun:test"
import { preferEffectSchemaGuard } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-schema-guard reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaGuard))
