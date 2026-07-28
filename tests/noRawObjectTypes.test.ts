import { test } from "bun:test"
import { noRawObjectTypes } from "@better-typescript/guidance/policies/noRawObjectTypes"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-raw-object-types reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noRawObjectTypes))
