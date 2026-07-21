import { test } from "node:test"
import { preferEffectSchemaIs } from "@better-typescript/guidance/policies/preferEffectSchemaIs"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-is reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaIs))
