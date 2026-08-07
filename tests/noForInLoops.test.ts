import { test } from "bun:test"
import { noForInLoops } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-for-in-loops reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noForInLoops))
