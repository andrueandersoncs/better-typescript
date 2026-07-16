import { test } from "node:test"
import { preferEffectArray } from "@better-typescript/checks/preferEffectArray"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-array reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectArray))
