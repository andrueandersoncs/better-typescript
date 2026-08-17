import { test } from "bun:test"
import { noNewError } from "@better-typescript/guidance/preset/errorHygienePolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-new-error reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNewError))
