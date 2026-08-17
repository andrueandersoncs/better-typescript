import { test } from "bun:test"
import { preferEffectRecordFilterMap } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-record-filter-map reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectRecordFilterMap))
