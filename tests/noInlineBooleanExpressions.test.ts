import { test } from "node:test"
import { noInlineBooleanExpressions } from "@better-typescript/guidance/policies/noInlineBooleanExpressions"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-inline-boolean-expressions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noInlineBooleanExpressions))
