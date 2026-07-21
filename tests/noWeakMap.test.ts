import { test } from "node:test"
import { noWeakMap } from "@better-typescript/guidance/policies/noWeakMap"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-weak-map reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noWeakMap))
