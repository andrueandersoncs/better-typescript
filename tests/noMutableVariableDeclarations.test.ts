import { test } from "bun:test"
import { noMutableVariableDeclarations } from "@better-typescript/guidance/preset/expressionAndMutationPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-mutable-variable-declarations reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMutableVariableDeclarations))
