import { test } from "node:test"
import { preferEffectFunctionConstant } from "@better-typescript/checks/preferEffectFunctionConstant"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-function-constant reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectFunctionConstant))
