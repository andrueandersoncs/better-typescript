import { test } from "bun:test"
import { noFirstPartySchemaDeclare } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-first-party-schema-declare reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noFirstPartySchemaDeclare))
