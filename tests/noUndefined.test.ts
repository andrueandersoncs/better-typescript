import { test } from "bun:test"
import { noUndefined } from "@better-typescript/guidance/preset/errorHygienePolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-undefined reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noUndefined))
