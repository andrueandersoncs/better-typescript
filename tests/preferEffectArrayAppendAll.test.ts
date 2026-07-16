import { test } from "node:test"
import { preferEffectArrayAppendAll } from "@better-typescript/checks/preferEffectArrayAppendAll"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-array-append-all reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectArrayAppendAll))
