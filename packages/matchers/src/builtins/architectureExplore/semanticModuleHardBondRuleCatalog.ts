import type { SemanticModuleHardBondRule } from "./semanticModuleHardBondRule.js"

// HardBondRuleCatalog is explicit because presets pass immutable rule sets.
export type SemanticModuleHardBondRuleCatalog = ReadonlyArray<SemanticModuleHardBondRule>
