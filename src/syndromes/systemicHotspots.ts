import { AtLeast, FindingOf } from "../matcher/language.js"
import { Syndrome } from "./types.js"

const hotSubsystemAdvice = new FindingOf({ detectorId: "hot-subsystem" })

// hot-subsystem demands a 60% share of the project's findings, so it is unique by construction; the systemic condition is that dominance PLUS dense files, not two dominant subsystems.
const oneHotSubsystem = new AtLeast({ minimum: 1, term: hotSubsystemAdvice })

const denseFileAdvice = new FindingOf({ detectorId: "high-match-density" })

// Two individually dense files alongside a dominating subsystem: the campaign is codebase-shaped, not file-shaped. Both terms quantify over other detectors' advice, so this sentence evaluates one stratum above them.
const severalDenseFiles = new AtLeast({ minimum: 2, term: denseFileAdvice })

export const systemicHotspots = new Syndrome({
  id: "systemic-hotspots",
  title: "systemic hotspots",
  level: "project",
  require: [oneHotSubsystem, severalDenseFiles],
  observe: [],
  remediation:
    "One subsystem dominates the findings and several files are individually dense: " +
    "file-by-file cleanup will thrash. Plan the campaign top-down — rewrite the hot " +
    "subsystem's shape first (Ref/Layer inversion, data-last signatures), let that land " +
    "the architectural pattern, then sweep the remaining dense files against it."
})
