import { test } from "node:test"
import { requireConversionDirectionConsistency } from "@better-typescript/checks/requireConversionDirectionConsistency"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-conversion-direction-consistency reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(requireConversionDirectionConsistency))
