import { test } from "bun:test"
import { noPassThroughObjectWrappers } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-pass-through-object-wrappers reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noPassThroughObjectWrappers))
