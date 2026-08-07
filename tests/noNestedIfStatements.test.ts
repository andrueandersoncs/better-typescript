import { test } from "bun:test"
import { noNestedIfStatements } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-nested-if-statements reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNestedIfStatements))
