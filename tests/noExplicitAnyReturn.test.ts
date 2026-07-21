import { test } from "node:test"
import { noExplicitAnyReturn } from "@better-typescript/guidance/policies/noExplicitAnyReturn"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-explicit-any-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noExplicitAnyReturn))
