import { test } from "node:test"
import { preferResultConceptNames } from "@better-typescript/checks/preferResultConceptNames"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-result-concept-names reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferResultConceptNames))
