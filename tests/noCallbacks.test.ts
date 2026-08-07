import { test } from "bun:test"
import { noCallbacks } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-callbacks reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noCallbacks))
