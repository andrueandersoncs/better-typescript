import { Data } from "effect"
import type { ArchitectureRoleClassifier } from "../../support/architectureRoleClassifier.js"

// FunctionalCoreEffectPolicy is shared check config because wiring and detectors need one record.
export class FunctionalCoreEffectPolicy extends Data.Class<{
  readonly roleOf: ArchitectureRoleClassifier
  readonly capabilityModulePrefixes: ReadonlyArray<string>
  readonly resourceFactoryNames: ReadonlyArray<string>
  readonly resourceTypeSuffixes: ReadonlyArray<string>
}> {}
