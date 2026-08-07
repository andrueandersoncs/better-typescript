import { test } from "bun:test"
import { preferEffectFn } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-effect-fn reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferEffectFn))
