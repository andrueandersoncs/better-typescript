import { test } from "node:test"
import { noForLoops } from "@better-typescript/checks/noForLoops"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-for-loops reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noForLoops))
