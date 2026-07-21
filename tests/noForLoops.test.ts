import { test } from "node:test"
import { noForLoops } from "@better-typescript/guidance/policies/noForLoops"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-for-loops reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noForLoops))
