import { test } from "bun:test"
import { noTrivialEffectFn } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-trivial-effect-fn reports forwarding wrappers and permits workflows", () =>
  assertPolicyFixture(noTrivialEffectFn))
