import { test } from "node:test"
import { preferImplicitReturn } from "@better-typescript/checks/preferImplicitReturn"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-implicit-return reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferImplicitReturn))
