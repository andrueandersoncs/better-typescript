import { test } from "node:test"
import { noUnused } from "@better-typescript/checks/noUnused"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-unused reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noUnused))
