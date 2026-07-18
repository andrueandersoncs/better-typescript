import { test } from "node:test"
import { requireLookupTotalityNameConsistency } from "@better-typescript/checks/requireLookupTotalityNameConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-lookup-totality-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requireLookupTotalityNameConsistency))
