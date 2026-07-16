import { test } from "node:test"
import { noNestedIfStatements } from "@better-typescript/checks/noNestedIfStatements"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-nested-if-statements reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noNestedIfStatements))
