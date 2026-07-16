import { test } from "node:test"
import { noMultipleBooleanOperators } from "@better-typescript/checks/noMultipleBooleanOperators"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-multiple-boolean-operators reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noMultipleBooleanOperators))
