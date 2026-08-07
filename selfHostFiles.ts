// Every package dogfoods every shipped wiring. Policy implementations are production code, not an
// exemption: their fixtures prove recognizers while self-hosting proves they follow the policy.
export const selfHostProductFiles = ["packages/*/src/**"] as const
export const selfHostArchitectureFiles = [
  "better-typescript.config.ts",
  "selfHostFiles.ts",
  "selfHostWiring.ts",
  ...selfHostProductFiles,
  "tests/**"
] as const
