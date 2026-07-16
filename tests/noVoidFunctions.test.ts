import { test } from "node:test"
import { noVoidFunctions } from "@better-typescript/checks/noVoidFunctions"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-void-functions reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noVoidFunctions))
