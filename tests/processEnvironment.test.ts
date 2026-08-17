import { test } from "bun:test"
import { processEnvironment } from "@better-typescript/guidance/preset/errorHygienePolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"

test("process-environment reports production reads and permits roots and tests", () =>
  assertPolicyFixture(processEnvironment))
