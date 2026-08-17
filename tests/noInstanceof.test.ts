import { test } from "bun:test"
import { noInstanceof } from "@better-typescript/guidance/preset/dispatchAndCollectionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-instanceof reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noInstanceof))
