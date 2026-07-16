import { test } from "node:test"
import { noThrow } from "@better-typescript/checks/noThrow"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-throw reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noThrow))
