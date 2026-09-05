# TypeScript context

Apply this guidance as context to the selected software workflow when it designs, writes, reviews, diagnoses, optimizes, or migrates TypeScript or TSX code.

1. Detect the supported TypeScript version and reuse the repository's established type, schema, and naming conventions.
2. Model mutually exclusive states with discriminated unions. Construct types from valid cases instead of using optional-field bags that admit contradictory combinations.
3. Brand or wrap a primitive only when values with the same representation can be confused. Validate at construction and trust the resulting type downstream.
4. Treat external data as `unknown`. Parse it once at the system boundary into a named domain type.
5. Narrow with evidence from discriminants, property presence, runtime types, or the repository's schema system. Do not use a cast or assertion to claim an unproved fact.
6. Derive types from authoritative schemas, generated clients, values, and function signatures instead of maintaining parallel declarations.
7. Match variants exhaustively so adding a case produces a compiler error at every incomplete decision point.
8. Keep the simplest type that makes each operation total. Strengthen an input or widen a result only where the looser type would require an assertion, cast, or impossible-case failure.

The selected workflow owns sequence, completion, and verification. Repository rules and authoritative generated or installed-package guidance control when they are more specific.
