import { test } from "bun:test"
import { preferEffectSchemaIs } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-schema-is reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaIs))
