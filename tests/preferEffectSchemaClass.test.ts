import { test } from "node:test"
import { preferEffectSchemaClass } from "@better-typescript/checks/preferEffectSchemaClass"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-class reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectSchemaClass))
