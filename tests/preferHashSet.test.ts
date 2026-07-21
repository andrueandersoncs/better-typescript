import { test } from "node:test"
import { preferHashSet } from "@better-typescript/guidance/policies/preferHashSet"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-hash-set reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferHashSet))
