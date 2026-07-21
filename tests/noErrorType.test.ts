import { test } from "node:test"
import { noErrorType } from "@better-typescript/guidance/policies/noErrorType"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-error-type reports built-in Error types and permits allowed fixture items", () =>
  assertPolicyFixture(noErrorType))
