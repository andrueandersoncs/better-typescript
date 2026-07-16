import { test } from "node:test"
import { noInstanceof } from "@better-typescript/checks/noInstanceof"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-instanceof reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noInstanceof))
