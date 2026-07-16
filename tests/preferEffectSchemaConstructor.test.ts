import { test } from "node:test"
import { preferEffectSchemaConstructor } from "@better-typescript/checks/preferEffectSchemaConstructor"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-constructor reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectSchemaConstructor))
