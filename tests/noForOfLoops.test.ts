import { test } from "node:test"
import { noForOfLoops } from "@better-typescript/checks/noForOfLoops"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-for-of-loops reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noForOfLoops))
