import { test } from "bun:test"
import { noDuplicateFunctionNames } from "@better-typescript/guidance/policies/noDuplicateFunctionNames"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-duplicate-function-names reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noDuplicateFunctionNames))
