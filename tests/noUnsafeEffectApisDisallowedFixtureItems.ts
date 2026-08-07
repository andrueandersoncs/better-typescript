import type { ExpectedDetection } from "./expectedDetection.js"

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

export const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
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
