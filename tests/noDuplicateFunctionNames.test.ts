import { test } from "bun:test"
import { noDuplicateFunctionNames } from "@better-typescript/guidance/preset/expressionAndMutationPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-duplicate-function-names reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noDuplicateFunctionNames))
