import { test } from "bun:test"
import { preferEffectSchemaConstructor } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-schema-constructor reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaConstructor))
