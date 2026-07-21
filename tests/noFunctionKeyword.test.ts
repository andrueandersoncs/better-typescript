import { test } from "node:test"
import { noFunctionKeyword } from "@better-typescript/guidance/policies/noFunctionKeyword"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-function-keyword reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noFunctionKeyword))
