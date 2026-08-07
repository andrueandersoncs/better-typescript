import { test } from "bun:test"
import { preferSpecificOperationNames } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-specific-operation-names reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferSpecificOperationNames))
