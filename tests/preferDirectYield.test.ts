import { test } from "node:test"
import { preferDirectYield } from "@better-typescript/guidance/policies/preferDirectYield"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-direct-yield reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferDirectYield))
