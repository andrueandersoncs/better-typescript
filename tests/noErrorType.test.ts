import { test } from "bun:test"
import { noErrorType } from "@better-typescript/guidance/preset/errorHygienePolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-error-type reports built-in Error types and permits allowed fixture items", () =>
  assertPolicyFixture(noErrorType))
