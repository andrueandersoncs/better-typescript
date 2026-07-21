import { test } from "node:test"
import { noManualTypeDispatch } from "@better-typescript/guidance/policies/noManualTypeDispatch"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-manual-type-dispatch reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noManualTypeDispatch))
