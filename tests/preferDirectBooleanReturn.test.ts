import { test } from "bun:test"
import { preferDirectBooleanReturn } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-direct-boolean-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferDirectBooleanReturn))
