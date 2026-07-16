import { test } from "node:test"
import { noErrorType } from "@better-typescript/checks/noErrorType"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-error-type reports built-in Error types and permits allowed fixture items", () =>
  assertCheckFixture(noErrorType))
