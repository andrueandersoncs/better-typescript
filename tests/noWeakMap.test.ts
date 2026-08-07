import { test } from "bun:test"
import { noWeakMap } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-weak-map reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noWeakMap))
