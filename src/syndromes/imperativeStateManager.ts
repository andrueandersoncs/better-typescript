import { AtLeast, FindingOf, FindingWithFacet } from "../matcher/language.js"
import { Syndrome } from "./types.js"

// Eight shared-state writes in one file is a state manager by design, not a handful of slips.
const sharedStateWrite = new FindingWithFacet({
  detectorId: "no-mutation",
  facet: "shared-state"
})

const manySharedStateWrites = new AtLeast({
  minimum: 8,
  term: sharedStateWrite
})

const mutationFindings = new FindingOf({ detectorId: "no-mutation" })

const hashMapFindings = new FindingOf({ detectorId: "prefer-hash-map" })

const hashSetFindings = new FindingOf({ detectorId: "prefer-hash-set" })

const mutableArrayFindings = new FindingOf({
  detectorId: "no-mutable-array-methods"
})

const mutableDeclarationFindings = new FindingOf({
  detectorId: "no-mutable-variable-declarations"
})

export const imperativeStateManager = new Syndrome({
  id: "imperative-state-manager",
  title: "imperative state manager",
  level: "file",
  require: [manySharedStateWrites],
  observe: [
    mutationFindings,
    hashMapFindings,
    hashSetFindings,
    mutableArrayFindings,
    mutableDeclarationFindings
  ],
  remediation:
    "This file manages long-lived state outside the runtime; element-level rewrites patch " +
    "symptoms. Hold each cell in a Ref (SynchronizedRef when updates contend), fan out to " +
    "subscribers with PubSub, assemble the manager as a Layer, and enter the Effect " +
    "runtime once at the boundary."
})
