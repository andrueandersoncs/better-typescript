import { test } from "node:test"
import { preferEtaReduction } from "@better-typescript/checks/preferEtaReduction"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-eta-reduction reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEtaReduction))
