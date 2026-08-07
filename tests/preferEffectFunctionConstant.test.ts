import { test } from "bun:test"
import { preferEffectFunctionConstant } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-function-constant reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectFunctionConstant))
