import { test } from "node:test"
import { preferPipeFunction } from "@better-typescript/guidance/policies/preferPipeFunction"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-pipe-function reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferPipeFunction))
