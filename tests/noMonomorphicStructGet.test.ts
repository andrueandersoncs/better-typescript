import { test } from "node:test"
import { noMonomorphicStructGet } from "@better-typescript/guidance/policies/noMonomorphicStructGet"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-monomorphic-struct-get reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noMonomorphicStructGet))
