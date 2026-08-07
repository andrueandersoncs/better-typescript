import { test } from "bun:test"
import { preferComposedCallbacks } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-composed-callbacks reports composed callbacks and permits other adapters", () =>
  assertPolicyFixture(preferComposedCallbacks))
