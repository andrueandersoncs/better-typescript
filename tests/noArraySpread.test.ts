import { test } from "bun:test"
import { noArraySpread } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-array-spread reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noArraySpread))
