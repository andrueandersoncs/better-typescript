import { test } from "node:test"
import { noDuplicateIfBodies } from "@better-typescript/checks/noDuplicateIfBodies"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-duplicate-if-bodies reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noDuplicateIfBodies))
