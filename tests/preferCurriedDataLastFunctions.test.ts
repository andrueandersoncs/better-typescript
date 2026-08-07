import { test } from "bun:test"
import { preferCurriedDataLastFunctions } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-curried-data-last-functions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferCurriedDataLastFunctions))
