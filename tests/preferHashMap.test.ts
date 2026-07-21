import { test } from "node:test"
import { preferHashMap } from "@better-typescript/guidance/policies/preferHashMap"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-hash-map reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferHashMap))
