import { test } from "bun:test"
import { noMultipleBooleanOperators } from "@better-typescript/guidance/policies/noMultipleBooleanOperators"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-multiple-boolean-operators reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMultipleBooleanOperators))
