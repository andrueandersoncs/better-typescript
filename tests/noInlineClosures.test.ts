import { test } from "node:test"
import { noInlineClosures } from "@better-typescript/checks/noInlineClosures"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-inline-closures reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noInlineClosures))
