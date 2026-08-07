import { test } from "bun:test"
import { preferEffectSchemaRecord } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-schema-record reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectSchemaRecord))
