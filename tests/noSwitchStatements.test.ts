import { test } from "node:test"
import { noSwitchStatements } from "@better-typescript/guidance/policies/noSwitchStatements"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-switch-statements reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noSwitchStatements))
