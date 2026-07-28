import { test } from "bun:test"
import { noFirstPartySchemaDeclare } from "@better-typescript/guidance/policies/noFirstPartySchemaDeclare"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-first-party-schema-declare reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noFirstPartySchemaDeclare))
