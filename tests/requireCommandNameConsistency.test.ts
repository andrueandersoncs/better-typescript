import { test } from "bun:test"
import { requireCommandNameConsistency } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("require-command-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireCommandNameConsistency))
