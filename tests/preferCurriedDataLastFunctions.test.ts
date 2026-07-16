import { test } from "node:test"
import { preferCurriedDataLastFunctions } from "@better-typescript/checks/preferCurriedDataLastFunctions"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-curried-data-last-functions reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferCurriedDataLastFunctions))
