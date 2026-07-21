import { test } from "node:test"
import { noUnsafeEffectApis } from "@better-typescript/guidance/policies/noUnsafeEffectApis"
import {
  assertPolicyFixtureExpectations,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const message = "Avoid unsafe Effect APIs."

const hint =
  "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics " +
  "explicitly. If no safe counterpart preserves the required behavior, redesign the boundary " +
  "instead of using an API whose name contains unsafe."

const makeDetection = (name: string, line: number, column: number): ExpectedDetection => ({
  name,
  fileName: "src/cases.ts",
  line,
  column,
  message,
  hint
})

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  makeDetection("Ref.makeUnsafe property access", 9, 26),
  makeDetection("effect/Ref namespace makeUnsafe", 10, 29),
  makeDetection("renamed named import makeUnsafe", 11, 27),
  makeDetection("first-party re-export makeUnsafe", 12, 28),
  makeDetection("value alias reference to makeUnsafe", 13, 25),
  makeDetection("HashMap.getUnsafe property access", 14, 29),
  makeDetection("HashMap element access getUnsafe", 15, 27),
  makeDetection("non-makeUnsafe suffix Ref.getUnsafe", 16, 29),
  makeDetection("lowercase-prefix unsafeSecureJsonParse", 17, 32),
  makeDetection("renamed import without unsafe in local name", 18, 31)
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "safe Ref.make",
    fileName: "src/allowed.ts",
    line: 7,
    column: 24
  },
  {
    name: "safe HashMap.get",
    fileName: "src/allowed.ts",
    line: 8,
    column: 27
  },
  {
    name: "safe Option.fromNullishOr",
    fileName: "src/allowed.ts",
    line: 9,
    column: 27
  },
  {
    name: "safe Result.succeed",
    fileName: "src/allowed.ts",
    line: 10,
    column: 27
  },
  {
    name: "local function name containing unsafe",
    fileName: "src/allowed.ts",
    line: 13,
    column: 32
  },
  {
    name: "external-package makeUnsafe",
    fileName: "src/allowed.ts",
    line: 15,
    column: 31
  },
  {
    name: "external-package unsafeParse",
    fileName: "src/allowed.ts",
    line: 16,
    column: 30
  },
  {
    name: "unsafe name in string literal",
    fileName: "src/allowed.ts",
    line: 18,
    column: 35
  },
  {
    name: "unsafe API names in documentation string",
    fileName: "src/allowed.ts",
    line: 19,
    column: 21
  },
  {
    name: "type-only typeof makeUnsafe import",
    fileName: "src/allowed.ts",
    line: 22,
    column: 31
  }
]

test("no-unsafe-effect-apis reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixtureExpectations(noUnsafeEffectApis, disallowedFixtureItems, allowedFixtureItems))
