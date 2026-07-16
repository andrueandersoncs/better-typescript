import { test } from "node:test"
import { preferEffectFn } from "@better-typescript/checks/preferEffectFn"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-fn reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectFn))
