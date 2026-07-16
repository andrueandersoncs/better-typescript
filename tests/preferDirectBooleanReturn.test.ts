import { test } from "node:test"
import { preferDirectBooleanReturn } from "@better-typescript/checks/preferDirectBooleanReturn"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-direct-boolean-return reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferDirectBooleanReturn))
