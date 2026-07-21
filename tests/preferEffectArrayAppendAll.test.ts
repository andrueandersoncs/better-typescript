import { test } from "node:test"
import { preferEffectArrayAppendAll } from "@better-typescript/guidance/policies/preferEffectArrayAppendAll"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-effect-array-append-all reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectArrayAppendAll))
