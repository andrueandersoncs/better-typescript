import { test } from "node:test"
import { noInlineClosures } from "@better-typescript/guidance/policies/noInlineClosures"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-inline-closures reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noInlineClosures))
