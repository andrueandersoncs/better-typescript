import { test } from "bun:test"
import { preferDirectYield } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-direct-yield reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferDirectYield))
