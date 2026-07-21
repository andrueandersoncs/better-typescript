import { test } from "node:test"
import { noDuplicateIfBodies } from "@better-typescript/guidance/policies/noDuplicateIfBodies"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-duplicate-if-bodies reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noDuplicateIfBodies))
