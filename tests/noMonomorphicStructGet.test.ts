import { test } from "node:test"
import { noMonomorphicStructGet } from "@better-typescript/checks/noMonomorphicStructGet"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-monomorphic-struct-get reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noMonomorphicStructGet))
