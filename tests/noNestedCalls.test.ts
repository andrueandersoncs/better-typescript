import { test } from "bun:test"
import { noNestedCalls } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-nested-calls reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noNestedCalls))
