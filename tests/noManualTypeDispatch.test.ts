import { test } from "node:test"
import { noManualTypeDispatch } from "@better-typescript/checks/noManualTypeDispatch"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-manual-type-dispatch reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noManualTypeDispatch))
