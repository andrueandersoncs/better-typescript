import { test } from "node:test"
import { noMutableArrayMethods } from "@better-typescript/guidance/policies/noMutableArrayMethods"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-mutable-array-methods reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMutableArrayMethods))
