import { test } from "node:test"
import { noCallbacks } from "@better-typescript/guidance/policies/noCallbacks"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-callbacks reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noCallbacks))
