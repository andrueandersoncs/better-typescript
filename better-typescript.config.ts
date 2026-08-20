import { defineConfig } from "@better-typescript/core/config"

export default defineConfig([
  {
    files: [
      "packages/{core,cli}/src/**/*.ts",
      "packages/rules/src/builtinRules.ts",
      "packages/rules/src/internal/**/*.ts",
      "packages/rules/src/rules/*/*.ts"
    ],
    rules: { "*": "error" }
  }
])
