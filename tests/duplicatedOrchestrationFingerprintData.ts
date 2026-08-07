import { CompositionFingerprintData } from "@better-typescript/matchers/builtins/compositionFingerprints"

export const fingerprintData = (
  fingerprint: string,
  stepCount: number,
  exportName: string,
  projectPath = "project"
): CompositionFingerprintData =>
  CompositionFingerprintData.make({ projectPath, fingerprint, stepCount, exportName })
