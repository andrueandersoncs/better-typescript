import { CollidingLines } from "../matcher/language.js"
import { Syndrome } from "./types.js"

// One dual-flagged line can be coincidence; two establishes the pattern of appeasing one rule by tripping another.
const repeatedCollisions = new CollidingLines({ minimum: 2 })

export const sideEffectLaundering = new Syndrome({
  id: "side-effect-laundering",
  title: "colliding fixes on shared expressions",
  level: "file",
  require: [repeatedCollisions],
  observe: [],
  remediation:
    "Multiple rules dispute the same expressions: each expression is doing two jobs, and " +
    "any edit that appeases one rule trips another. Restructure instead of appeasing — " +
    "split the expression, or annotate the value with the consuming library's own " +
    "callback type so the contract is the consumer's."
})
