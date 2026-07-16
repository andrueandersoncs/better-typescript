import { test } from "node:test"
import { noNewError } from "@better-typescript/checks/noNewError"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-new-error reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noNewError))
