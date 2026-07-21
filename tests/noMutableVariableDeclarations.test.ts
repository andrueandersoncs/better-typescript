import { test } from "node:test"
import { noMutableVariableDeclarations } from "@better-typescript/guidance/policies/noMutableVariableDeclarations"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-mutable-variable-declarations reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMutableVariableDeclarations))
