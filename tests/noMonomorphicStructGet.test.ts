import { test } from "bun:test"
import { noMonomorphicStructGet } from "@better-typescript/guidance/preset/dispatchAndCollectionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-monomorphic-struct-get reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMonomorphicStructGet))
