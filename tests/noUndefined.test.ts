import { test } from "node:test"
import { noUndefined } from "@better-typescript/guidance/policies/noUndefined"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-undefined reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noUndefined))
