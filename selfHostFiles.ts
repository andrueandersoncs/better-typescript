// Product policies dogfood package production code while Architecture Explore also sees tests and
// composition roots because its evidence depends on the complete workspace horizon.
export const selfHostProductFiles = ["packages/*/src/**"] as const
export const selfHostArchitectureFiles = [
  "better-typescript.config.ts",
  "selfHostFiles.ts",
  "selfHostWiring.ts",
  ...selfHostProductFiles,
  "tests/**"
] as const
