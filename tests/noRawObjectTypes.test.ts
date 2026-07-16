import { test } from "node:test"
import { noRawObjectTypes } from "@better-typescript/checks/noRawObjectTypes"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-raw-object-types reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noRawObjectTypes))
