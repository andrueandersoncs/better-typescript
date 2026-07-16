import { test } from "node:test"
import { noCallbacks } from "@better-typescript/checks/noCallbacks"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-callbacks reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noCallbacks))
