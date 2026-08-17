import { test } from "bun:test"
import { noForOfLoops } from "@better-typescript/guidance/preset/controlFlowPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-for-of-loops reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noForOfLoops))
