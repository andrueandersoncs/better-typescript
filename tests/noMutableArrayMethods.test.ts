import { test } from "bun:test"
import { noMutableArrayMethods } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-mutable-array-methods reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMutableArrayMethods))
