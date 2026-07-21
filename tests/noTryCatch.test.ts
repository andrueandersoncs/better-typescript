import { test } from "node:test"
import { noTryCatch } from "@better-typescript/guidance/policies/noTryCatch"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-try-catch reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noTryCatch))
