import { test } from "bun:test"
import { noForLoops } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-for-loops reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noForLoops))
