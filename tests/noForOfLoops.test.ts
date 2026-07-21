import { test } from "node:test"
import { noForOfLoops } from "@better-typescript/guidance/policies/noForOfLoops"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-for-of-loops reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noForOfLoops))
