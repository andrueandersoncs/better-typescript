import { test } from "node:test"
import { noFirstPartySchemaDeclare } from "@better-typescript/checks/noFirstPartySchemaDeclare"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-first-party-schema-declare reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noFirstPartySchemaDeclare))
