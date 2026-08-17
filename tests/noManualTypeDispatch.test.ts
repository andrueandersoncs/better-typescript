import { test } from "bun:test"
import { noManualTypeDispatch } from "@better-typescript/guidance/preset/dispatchAndCollectionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-manual-type-dispatch reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noManualTypeDispatch))
