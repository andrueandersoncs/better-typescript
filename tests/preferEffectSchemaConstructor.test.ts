import { test } from "node:test"
import { preferEffectSchemaConstructor } from "@better-typescript/guidance/policies/preferEffectSchemaConstructor"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-constructor reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaConstructor))
