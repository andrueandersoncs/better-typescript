import { test } from "bun:test"
import { preferHashSet } from "@better-typescript/guidance/preset/dispatchAndCollectionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-hash-set reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferHashSet))
