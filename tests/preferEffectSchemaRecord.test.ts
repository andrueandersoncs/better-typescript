import { test } from "node:test"
import { preferEffectSchemaRecord } from "@better-typescript/checks/preferEffectSchemaRecord"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-schema-record reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectSchemaRecord))
