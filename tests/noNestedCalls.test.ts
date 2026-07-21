import { test } from "node:test"
import { noNestedCalls } from "@better-typescript/guidance/policies/noNestedCalls"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-nested-calls reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNestedCalls))
