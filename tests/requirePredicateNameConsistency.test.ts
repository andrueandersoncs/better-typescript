import { test } from "bun:test"
import { requirePredicateNameConsistency } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("require-predicate-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requirePredicateNameConsistency))
