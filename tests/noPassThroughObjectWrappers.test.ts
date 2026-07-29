import { test } from "bun:test"
import { noPassThroughObjectWrappers } from "@better-typescript/guidance/policies/noPassThroughObjectWrappers"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-pass-through-object-wrappers reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noPassThroughObjectWrappers))
