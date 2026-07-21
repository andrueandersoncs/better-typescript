import { test } from "node:test"
import { noNewError } from "@better-typescript/guidance/policies/noNewError"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-new-error reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNewError))
