import { test } from "node:test"
import { noArraySpread } from "@better-typescript/guidance/policies/noArraySpread"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-array-spread reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noArraySpread))
