import { test } from "bun:test"
import { preferEffectSchemaRecord } from "@better-typescript/guidance/policies/preferEffectSchemaRecord"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-record reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaRecord))
