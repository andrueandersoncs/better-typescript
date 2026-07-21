import { test } from "node:test"
import { preferCurriedDataLastFunctions } from "@better-typescript/guidance/policies/preferCurriedDataLastFunctions"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-curried-data-last-functions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferCurriedDataLastFunctions))
