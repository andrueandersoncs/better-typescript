import { test } from "node:test"
import { preferComposedCallbacks } from "@better-typescript/checks/preferComposedCallbacks"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-composed-callbacks reports composed callbacks and permits other adapters", () =>
  assertCheckFixture(preferComposedCallbacks))
