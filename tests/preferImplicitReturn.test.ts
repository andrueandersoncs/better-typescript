import { test } from "bun:test"
import { preferImplicitReturn } from "@better-typescript/guidance/policies/preferImplicitReturn"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-implicit-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferImplicitReturn))
