import { test } from "node:test"
import { preferHashSet } from "@better-typescript/checks/preferHashSet"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-hash-set reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferHashSet))
