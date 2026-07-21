import { test } from "node:test"
import { preferResultConceptNames } from "@better-typescript/guidance/policies/preferResultConceptNames"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-result-concept-names reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferResultConceptNames))
