import { test } from "node:test"
import { preferEffectRecordFilterMap } from "@better-typescript/checks/preferEffectRecordFilterMap"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-record-filter-map reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectRecordFilterMap))
