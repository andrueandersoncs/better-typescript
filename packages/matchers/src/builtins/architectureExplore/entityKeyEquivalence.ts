import { Array, Equivalence, Struct } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

const keyPathEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<string>(),
  Struct.get("path")
)

const keyStartEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<number>(),
  Struct.get("start")
)

const keyEndEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<number>(),
  Struct.get("end")
)

const keyKindEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<number>(),
  Struct.get("syntaxKind")
)

const keyEquivalences = Array.make(
  keyPathEquivalence,
  keyStartEquivalence,
  keyEndEquivalence,
  keyKindEquivalence
)

export const entityKeyEquivalence = Equivalence.combineAll(keyEquivalences)

export {
  keyPathEquivalence,
  keyStartEquivalence,
  keyEndEquivalence,
  keyKindEquivalence,
  keyEquivalences
}
