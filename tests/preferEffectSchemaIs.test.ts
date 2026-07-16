import { test } from "node:test"
import { preferEffectSchemaIs } from "@better-typescript/checks/preferEffectSchemaIs"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-is reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectSchemaIs))
