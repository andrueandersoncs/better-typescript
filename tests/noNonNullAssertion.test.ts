import { test } from "bun:test"
import { noNonNullAssertion } from "@better-typescript/guidance/preset/expressionAndMutationPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-non-null-assertion reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNonNullAssertion))
