import { test } from "bun:test"
import { preferPipeFunction } from "@better-typescript/guidance/preset/dispatchAndCollectionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-pipe-function reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferPipeFunction))
