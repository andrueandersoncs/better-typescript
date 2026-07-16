import { test } from "node:test"
import { noNestedCalls } from "@better-typescript/checks/noNestedCalls"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-nested-calls reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noNestedCalls))
