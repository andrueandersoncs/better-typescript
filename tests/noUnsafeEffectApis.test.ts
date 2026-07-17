import { test } from "node:test"
import { noUnsafeEffectApis } from "@better-typescript/checks/noUnsafeEffectApis"
import {
  assertCheckFixtureExpectations,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const message = "Avoid unsafe Effect APIs."

const hint =
  "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics " +
  "explicitly. If no safe counterpart preserves the required behavior, redesign the boundary " +
  "instead of using an API whose name contains unsafe."

const detection = (name: string, line: number, column: number): ExpectedDetection => ({
  name,
  fileName: "src/cases.ts",
  line,
  column,
  message,
  hint
})

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  detection("Ref.makeUnsafe property access", 9, 26),
  detection("effect/Ref namespace makeUnsafe", 10, 29),
  detection("renamed named import makeUnsafe", 11, 27),
  detection("first-party re-export makeUnsafe", 12, 28),
  detection("value alias reference to makeUnsafe", 13, 25),
  detection("HashMap.getUnsafe property access", 14, 29),
  detection("HashMap element access getUnsafe", 15, 27),
  detection("non-makeUnsafe suffix Ref.getUnsafe", 16, 29),
  detection("lowercase-prefix unsafeSecureJsonParse", 17, 32),
  detection("renamed import without unsafe in local name", 18, 31)
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
  assertCheckFixtureExpectations(noUnsafeEffectApis, disallowedFixtureItems, allowedFixtureItems))
