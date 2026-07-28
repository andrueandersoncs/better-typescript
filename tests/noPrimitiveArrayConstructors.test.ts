import { test } from "bun:test"
import { noPrimitiveArrayConstructors } from "@better-typescript/guidance/policies/noPrimitiveArrayConstructors"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-primitive-array-constructors reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noPrimitiveArrayConstructors))
