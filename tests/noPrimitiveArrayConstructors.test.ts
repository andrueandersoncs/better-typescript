import { test } from "node:test"
import { noPrimitiveArrayConstructors } from "@better-typescript/checks/noPrimitiveArrayConstructors"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-primitive-array-constructors reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noPrimitiveArrayConstructors))
