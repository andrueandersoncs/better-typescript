import { test } from "node:test"
import { noAsyncFunctions } from "@better-typescript/checks/noAsyncFunctions"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-async-functions reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noAsyncFunctions))
