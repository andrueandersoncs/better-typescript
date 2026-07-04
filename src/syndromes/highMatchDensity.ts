import { AnyFinding, AtLeast, FindingBreakdown } from "../matcher/language.js"
import { Syndrome } from "./types.js"

// Ten findings in one file is past what expression-level accidents explain; the design, not the lines, is out of style.
const anyFinding = new AnyFinding({})

const denseFindings = new AtLeast({ minimum: 10, term: anyFinding })

const ruleProfile = new FindingBreakdown({})

// Registered as a fallback: it runs only when no specific file syndrome fired, so generic density advice never drowns out a precise diagnosis.
export const highMatchDensity = new Syndrome({
  id: "high-match-density",
  title: "high match density",
  level: "file",
  require: [denseFindings],
  observe: [ruleProfile],
  remediation:
    "Match density here signals an architectural mismatch, not local style slips. " +
    "Restructure the file around the Effect runtime (state in Ref, SynchronizedRef, or " +
    "PubSub; wiring in Layer; one runtime entry at the boundary) instead of fixing " +
    "matches one at a time — the inversion dissolves most of them."
})
