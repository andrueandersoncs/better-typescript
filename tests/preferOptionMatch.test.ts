import { test } from "bun:test"
import { preferOptionMatch } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-option-match reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferOptionMatch))
