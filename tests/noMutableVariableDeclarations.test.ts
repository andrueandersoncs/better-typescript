import { test } from "node:test"
import { noMutableVariableDeclarations } from "@better-typescript/checks/noMutableVariableDeclarations"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-mutable-variable-declarations reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noMutableVariableDeclarations))
