import { test } from "node:test"
import { preferPipeFunction } from "@better-typescript/checks/preferPipeFunction"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-pipe-function reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferPipeFunction))
