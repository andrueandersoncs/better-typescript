import { test } from "node:test"
import { preferFunctionComposition } from "@better-typescript/checks/preferFunctionComposition"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-function-composition reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferFunctionComposition))
