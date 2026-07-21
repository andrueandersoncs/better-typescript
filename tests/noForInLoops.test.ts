import { test } from "node:test"
import { noForInLoops } from "@better-typescript/guidance/policies/noForInLoops"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-for-in-loops reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noForInLoops))
