import { test } from "node:test"
import { noExplicitAnyReturn } from "@better-typescript/checks/noExplicitAnyReturn"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-explicit-any-return reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noExplicitAnyReturn))
