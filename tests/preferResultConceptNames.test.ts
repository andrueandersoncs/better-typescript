import { test } from "bun:test"
import { preferResultConceptNames } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-result-concept-names reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferResultConceptNames))
