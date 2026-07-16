import { test } from "node:test"
import { preferConditionalReturn } from "@better-typescript/checks/preferConditionalReturn"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-conditional-return reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferConditionalReturn))
