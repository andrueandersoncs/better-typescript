import { test } from "bun:test"
import { noRawObjectTypes } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-raw-object-types reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noRawObjectTypes))
