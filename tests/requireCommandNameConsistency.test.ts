import { test } from "node:test"
import { requireCommandNameConsistency } from "@better-typescript/checks/requireCommandNameConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-command-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requireCommandNameConsistency))
