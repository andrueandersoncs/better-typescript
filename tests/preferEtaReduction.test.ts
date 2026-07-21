import { test } from "node:test"
import { preferEtaReduction } from "@better-typescript/guidance/policies/preferEtaReduction"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-eta-reduction reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEtaReduction))
