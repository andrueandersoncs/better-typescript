import { test } from "bun:test"
import { noAsyncFunctions } from "@better-typescript/guidance/preset/controlFlowPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-async-functions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noAsyncFunctions))
