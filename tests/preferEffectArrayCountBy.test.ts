import { test } from "node:test"
import { preferEffectArrayCountBy } from "@better-typescript/checks/preferEffectArrayCountBy"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effect-array-count-by reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEffectArrayCountBy))
