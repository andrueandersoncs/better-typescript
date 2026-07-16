import { test } from "node:test"
import { noInlineBooleanExpressions } from "@better-typescript/checks/noInlineBooleanExpressions"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-inline-boolean-expressions reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noInlineBooleanExpressions))
