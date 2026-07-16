import { test } from "node:test"
import { noUndefined } from "@better-typescript/checks/noUndefined"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-undefined reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noUndefined))
