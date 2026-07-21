import { test } from "node:test"
import { noVoidFunctions } from "@better-typescript/guidance/policies/noVoidFunctions"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-void-functions reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noVoidFunctions))
