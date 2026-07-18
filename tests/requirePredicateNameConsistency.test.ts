import { test } from "node:test"
import { requirePredicateNameConsistency } from "@better-typescript/checks/requirePredicateNameConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-predicate-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requirePredicateNameConsistency))
