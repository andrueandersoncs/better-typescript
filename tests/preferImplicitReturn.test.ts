import { test } from "bun:test"
import { preferImplicitReturn } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-implicit-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferImplicitReturn))
