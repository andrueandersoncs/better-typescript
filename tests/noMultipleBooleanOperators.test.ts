import { test } from "bun:test"
import { noMultipleBooleanOperators } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-multiple-boolean-operators reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMultipleBooleanOperators))
