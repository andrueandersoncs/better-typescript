import { AnyFinding, AtLeast, DominantRule } from "../matcher/language.js"
import { Syndrome } from "./types.js"

// A rule producing 40%+ of findings across five or more files is systemic, not local.
const anyFinding = new AnyFinding({})

const meaningfulRunSize = new AtLeast({ minimum: 25, term: anyFinding })

const dominantRule = new DominantRule({
  numerator: 2,
  denominator: 5,
  minSpread: 5
})

export const ruleDominance = new Syndrome({
  id: "rule-dominance",
  title: "one rule dominates the run",
  level: "project",
  require: [meaningfulRunSize, dominantRule],
  observe: [],
  remediation:
    "A single rule produces most of the findings across many files: the pattern is " +
    "systemic, not local. Plan one mechanical migration — a codemod and a single review " +
    "— instead of fixing occurrences file by file."
})
