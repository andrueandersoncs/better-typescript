import * as ts from "typescript"

// ParseForTypeErrors keeps type-bearing JSDoc because Policies do not consume full JSDoc trees.
export const withAnalysisCompilerOptions = (
  options: ts.CompilerOptions,
  required: ts.CompilerOptions
) => Object.assign({}, options, required)
