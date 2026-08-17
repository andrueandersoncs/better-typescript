import { test } from "bun:test"
import { noExplicitAnyReturn } from "@better-typescript/guidance/preset/expressionAndMutationPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-explicit-any-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noExplicitAnyReturn))
