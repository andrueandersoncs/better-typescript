import { test } from "node:test"
import { requireConversionDirectionConsistency } from "@better-typescript/guidance/policies/requireConversionDirectionConsistency"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("require-conversion-direction-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireConversionDirectionConsistency))
