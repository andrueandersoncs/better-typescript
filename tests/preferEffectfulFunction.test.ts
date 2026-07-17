import { test } from "node:test"
import { preferEffectfulFunction } from "@better-typescript/checks/preferEffectfulFunction"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-effectful-function reports synchronous Effect wrappers and permits boundaries", () =>
  assertCheckFixture(preferEffectfulFunction))
