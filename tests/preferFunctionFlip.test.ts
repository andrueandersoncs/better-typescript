import { test } from "node:test"
import { preferFunctionFlip } from "@better-typescript/guidance/policies/preferFunctionFlip"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-function-flip reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferFunctionFlip))
