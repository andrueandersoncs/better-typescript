import { test } from "bun:test"
import { noDuplicateIfBodies } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-duplicate-if-bodies reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noDuplicateIfBodies))
