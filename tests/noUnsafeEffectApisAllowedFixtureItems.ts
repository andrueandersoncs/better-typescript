import type { FixtureItem } from "./fixtureItem.js"

export const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
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
