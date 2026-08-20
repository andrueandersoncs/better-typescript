import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { typescriptNamespaces } from "../index.js"

test("typescript-namespaces has exact public Violation output", () =>
  assertRuleViolations(typescriptNamespaces, import.meta.dir, "effect-quality", "expected.json"))
