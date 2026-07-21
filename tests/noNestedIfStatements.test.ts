import { test } from "node:test"
import { noNestedIfStatements } from "@better-typescript/guidance/policies/noNestedIfStatements"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-nested-if-statements reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNestedIfStatements))
