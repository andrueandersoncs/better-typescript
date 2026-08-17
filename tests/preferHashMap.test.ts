import { test } from "bun:test"
import { preferHashMap } from "@better-typescript/guidance/preset/dispatchAndCollectionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-hash-map reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferHashMap))
