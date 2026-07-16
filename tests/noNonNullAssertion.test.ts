import { test } from "node:test"
import { noNonNullAssertion } from "@better-typescript/checks/noNonNullAssertion"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-non-null-assertion reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noNonNullAssertion))
