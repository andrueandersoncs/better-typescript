import { test } from "bun:test"
import { noImmediateEffectSync } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-immediate-effect-sync reports immediately consumed Effects and permits deferred Effects", () =>
  assertPolicyFixture(noImmediateEffectSync))
