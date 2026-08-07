import { test } from "bun:test"
import { noFunctionKeyword } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-function-keyword reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noFunctionKeyword))
