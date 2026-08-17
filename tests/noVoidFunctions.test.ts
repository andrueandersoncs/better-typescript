import { test } from "bun:test"
import { noVoidFunctions } from "@better-typescript/guidance/preset/errorHygienePolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-void-functions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noVoidFunctions))
