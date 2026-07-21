import { test } from "node:test"
import { noNonNullAssertion } from "@better-typescript/guidance/policies/noNonNullAssertion"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-non-null-assertion reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNonNullAssertion))
