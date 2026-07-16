import { test } from "node:test"
import { noFunctionKeyword } from "@better-typescript/checks/noFunctionKeyword"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-function-keyword reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noFunctionKeyword))
