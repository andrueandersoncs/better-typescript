import { test } from "bun:test"
import { preferEtaReduction } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-eta-reduction reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEtaReduction))
