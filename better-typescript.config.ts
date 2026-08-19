import { defineConfig } from "@better-typescript/core/config"

export default defineConfig([
  {
    files: ["packages/{core,rules,cli}/src/**/*.ts"],
    rules: { "*": "error" }
  }
])
