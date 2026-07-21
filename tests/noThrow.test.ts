import { test } from "node:test"
import { noThrow } from "@better-typescript/guidance/policies/noThrow"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-throw reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noThrow))
