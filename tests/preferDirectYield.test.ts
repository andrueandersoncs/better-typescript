import { test } from "node:test"
import { preferDirectYield } from "@better-typescript/checks/preferDirectYield"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-direct-yield reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferDirectYield))
