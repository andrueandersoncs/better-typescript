import { detectionsEquivalence, equivalence } from "./operations.js"

// This file sorts before operations.ts, so its subject resolves only on a later derivation pass.
export const detectionBatchEquivalence = equivalence(detectionsEquivalence.equals)
