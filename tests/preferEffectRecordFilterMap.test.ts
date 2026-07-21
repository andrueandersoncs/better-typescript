import { test } from "node:test"
import { preferEffectRecordFilterMap } from "@better-typescript/guidance/policies/preferEffectRecordFilterMap"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-record-filter-map reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectRecordFilterMap))
