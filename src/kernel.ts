export type {
  FileHandler,
  NodeHandler,
  ProgramContext,
  RuleCheck,
  RuleContext,
  Subscription
} from "./detectors/rule.js"
export type { AstNodeElement } from "./detectors/sources.js"
export type {
  NamedRuleCheck,
  ReportWiring,
  RuleSignals
} from "./detectors/report.js"

export { checkFromSubscriptions } from "./detectors/rule.js"
export {
  combineAll,
  fileCheck,
  fileSubscriptions,
  nodeCheck,
  nodeSubscriptions,
  withProgramIndex
} from "./rules/ruleCheck.js"
export { Detection, Location, detection, locateNode } from "./detectors/location.js"
export {
  AdviceElement,
  NamedDetection,
  adviceLocation,
  byFile,
  collectSignals,
  collidingLines,
  countSummary,
  deriveSignals,
  dominantRuleEvidence,
  evidenceFromCounts,
  evidenceItem,
  evidenceOrder,
  namedDetection,
  parentDirectories
} from "./detectors/summary.js"
export {
  makeWiring,
  namedRuleCheck,
  reportFromWiring,
  ruleSignal,
  runRuleCheckOnProject,
  withFallbackAdvice
} from "./detectors/report.js"
export { watchReportFromWiring } from "./detectors/watch.js"
