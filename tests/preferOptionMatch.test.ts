import { test } from "node:test"
import { preferOptionMatch } from "@better-typescript/guidance/policies/preferOptionMatch"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-option-match reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferOptionMatch))
