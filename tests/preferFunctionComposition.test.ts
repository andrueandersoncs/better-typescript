import { test } from "node:test"
import { preferFunctionComposition } from "@better-typescript/guidance/policies/preferFunctionComposition"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-function-composition reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferFunctionComposition))
