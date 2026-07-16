import { test } from "node:test"
import { preferDataLastModule } from "@better-typescript/checks/preferDataLastModule"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-data-last-module reports misplaced data-last functions", () =>
  assertCheckFixture(preferDataLastModule))
