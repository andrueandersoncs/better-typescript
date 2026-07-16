import { test } from "node:test"
import { preferOptionMatch } from "@better-typescript/checks/preferOptionMatch"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-option-match reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferOptionMatch))
