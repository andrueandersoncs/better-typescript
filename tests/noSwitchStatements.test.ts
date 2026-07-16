import { test } from "node:test"
import { noSwitchStatements } from "@better-typescript/checks/noSwitchStatements"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-switch-statements reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noSwitchStatements))
