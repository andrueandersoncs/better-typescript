import { test } from "node:test"
import { noMutableArrayMethods } from "@better-typescript/checks/noMutableArrayMethods"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-mutable-array-methods reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noMutableArrayMethods))
