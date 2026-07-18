import { test } from "node:test"
import { preferSpecificOperationNames } from "@better-typescript/checks/preferSpecificOperationNames"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-specific-operation-names reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferSpecificOperationNames))
