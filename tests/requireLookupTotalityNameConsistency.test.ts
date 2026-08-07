import { test } from "bun:test"
import { requireLookupTotalityNameConsistency } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("require-lookup-totality-name-consistency reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(requireLookupTotalityNameConsistency))
