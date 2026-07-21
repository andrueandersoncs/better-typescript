import { test } from "node:test"
import { noInstanceof } from "@better-typescript/guidance/policies/noInstanceof"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-instanceof reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noInstanceof))
