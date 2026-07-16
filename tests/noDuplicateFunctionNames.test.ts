import { test } from "node:test"
import { noDuplicateFunctionNames } from "@better-typescript/checks/noDuplicateFunctionNames"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-duplicate-function-names reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noDuplicateFunctionNames))
