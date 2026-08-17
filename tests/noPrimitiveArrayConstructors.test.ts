import { test } from "bun:test"
import { noPrimitiveArrayConstructors } from "@better-typescript/guidance/preset/controlFlowPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-primitive-array-constructors reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noPrimitiveArrayConstructors))
