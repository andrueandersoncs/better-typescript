import { test } from "node:test"
import { requireResultShapeNameConsistency } from "@better-typescript/checks/requireResultShapeNameConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-result-shape-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requireResultShapeNameConsistency))
