import { test } from "node:test"
import { noForInLoops } from "@better-typescript/checks/noForInLoops"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-for-in-loops reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noForInLoops))
