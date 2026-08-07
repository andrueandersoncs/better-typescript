import { test } from "bun:test"
import { noInlineBooleanExpressions } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-inline-boolean-expressions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noInlineBooleanExpressions))
