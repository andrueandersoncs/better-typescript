import { test } from "bun:test"
import { noInlineClosures } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-inline-closures reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noInlineClosures))
