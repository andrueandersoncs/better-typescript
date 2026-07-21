import { test } from "node:test"
import { preferEffectSchemaGuard } from "@better-typescript/guidance/policies/preferEffectSchemaGuard"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-guard reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaGuard))
