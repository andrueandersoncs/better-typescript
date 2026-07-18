import { test } from "node:test"
import { requireConstructionNameConsistency } from "@better-typescript/checks/requireConstructionNameConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-construction-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requireConstructionNameConsistency))
