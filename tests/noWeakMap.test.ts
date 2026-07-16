import { test } from "node:test"
import { noWeakMap } from "@better-typescript/checks/noWeakMap"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-weak-map reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noWeakMap))
