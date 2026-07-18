import { test } from "node:test"
import { requireResultCardinalityNameConsistency } from "@better-typescript/checks/requireResultCardinalityNameConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-result-cardinality-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requireResultCardinalityNameConsistency))
