import { test } from "node:test"
import { preferHashMap } from "@better-typescript/checks/preferHashMap"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-hash-map reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferHashMap))
