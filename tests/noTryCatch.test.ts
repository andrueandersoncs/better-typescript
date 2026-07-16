import { test } from "node:test"
import { noTryCatch } from "@better-typescript/checks/noTryCatch"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-try-catch reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noTryCatch))
