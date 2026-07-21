import { test } from "node:test"
import { noAsyncFunctions } from "@better-typescript/guidance/policies/noAsyncFunctions"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-async-functions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noAsyncFunctions))
