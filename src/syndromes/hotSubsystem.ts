import {
  AnyFinding,
  AtLeast,
  FilesWithFindings,
  FindingBreakdown,
  ShareOfProject
} from "../matcher/language.js"
import { Syndrome } from "./types.js"

// A directory holding 60%+ of the project's findings across three or more files is the hot subsystem.
const anyFinding = new AnyFinding({})

const subsystemFindings = new AtLeast({ minimum: 25, term: anyFinding })

const subsystemSpread = new FilesWithFindings({ minimum: 3 })

const subsystemShare = new ShareOfProject({
  numerator: 3,
  denominator: 5,
  term: anyFinding
})

const ruleProfile = new FindingBreakdown({})

export const hotSubsystem = new Syndrome({
  id: "hot-subsystem",
  title: "hot subsystem",
  level: "directory",
  require: [subsystemFindings, subsystemSpread, subsystemShare],
  observe: [ruleProfile],
  remediation:
    "Findings concentrate in this directory: treat it as one subsystem to invert, not a " +
    "pile of files to patch. Give the subsystem a Layer of its own, move shared state " +
    "into Refs and PubSubs behind that Layer, and enter the runtime once at the " +
    "subsystem's edge."
})
