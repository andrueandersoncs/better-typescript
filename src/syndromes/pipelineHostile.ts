import { AtLeast, FindingOf } from "../matcher/language.js"
import { Syndrome } from "./types.js"

// Five inside-out calls beside five non-data-last signatures names the cause, not a coincidence.
const nestedCallFinding = new FindingOf({ detectorId: "no-nested-calls" })

const nestedCallFindings = new AtLeast({ minimum: 5, term: nestedCallFinding })

const uncurriedSignal = new FindingOf({
  detectorId: "prefer-curried-data-last-functions"
})

const uncurriedSignals = new AtLeast({ minimum: 5, term: uncurriedSignal })
export const pipelineHostile = new Syndrome({
  id: "pipeline-hostile",
  title: "pipeline-hostile module",
  level: "file",
  require: [nestedCallFindings, uncurriedSignals],
  observe: [],
  remediation:
    "This file composes inside-out because its functions are not data-last: call sites " +
    "cannot pipe, so results nest. Fix the signatures first — curry configuration ahead " +
    "of the data argument — and the nested-call findings dissolve at the call sites."
})
