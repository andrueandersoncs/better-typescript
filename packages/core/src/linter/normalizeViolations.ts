import { Array, Equivalence, Order, Struct } from "effect"
import type { EnabledRuleLevel } from "../config/config.js"
import type { Violation } from "./linter.js"

const violationOrders = Array.make(
  Order.mapInput<string, Violation>(Order.String, Struct.get("filePath")),
  Order.mapInput<number, Violation>(Order.Number, Struct.get("line")),
  Order.mapInput<number, Violation>(Order.Number, Struct.get("column")),
  Order.mapInput<string, Violation>(Order.String, Struct.get("ruleName")),
  Order.mapInput<string, Violation>(Order.String, Struct.get("level")),
  Order.mapInput<string, Violation>(Order.String, Struct.get("message"))
)

const violationOrder = Order.combineAll<Violation>(violationOrders)

const sameViolation = Equivalence.Struct({
  ruleName: Equivalence.strictEqual<string>(),
  level: Equivalence.strictEqual<EnabledRuleLevel>(),
  message: Equivalence.strictEqual<string>(),
  filePath: Equivalence.strictEqual<string>(),
  line: Equivalence.strictEqual<number>(),
  column: Equivalence.strictEqual<number>()
})

export const normalizeViolations = (violations: ReadonlyArray<Violation>) => {
  const orderedViolations = Array.sort(violations, violationOrder)

  return Array.dedupeWith(orderedViolations, sameViolation)
}
