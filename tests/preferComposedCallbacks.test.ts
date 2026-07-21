import { test } from "node:test"
import { preferComposedCallbacks } from "@better-typescript/guidance/policies/preferComposedCallbacks"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-composed-callbacks reports composed callbacks and permits other adapters", () =>
  assertPolicyFixture(preferComposedCallbacks))
