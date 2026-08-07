import { test } from "bun:test"
import { noThrow } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-throw reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noThrow))
