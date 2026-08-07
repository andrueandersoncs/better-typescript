import { test } from "bun:test"
import { noSwitchStatements } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-switch-statements reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noSwitchStatements))
