import { test } from "node:test"
import { preferEffectSchemaGuard } from "@better-typescript/checks/preferEffectSchemaGuard"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-guard reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectSchemaGuard))
