import { test } from "bun:test"
import { preferConditionalReturn } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-conditional-return reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferConditionalReturn))
