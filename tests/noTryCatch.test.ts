import { test } from "bun:test"
import { noTryCatch } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-try-catch reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noTryCatch))
