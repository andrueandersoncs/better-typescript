import { test } from "node:test"
import { preferFunctionFlip } from "@better-typescript/checks/preferFunctionFlip"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-function-flip reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferFunctionFlip))
