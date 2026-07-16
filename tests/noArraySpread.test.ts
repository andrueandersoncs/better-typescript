import { test } from "node:test"
import { noArraySpread } from "@better-typescript/checks/noArraySpread"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-array-spread reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noArraySpread))
