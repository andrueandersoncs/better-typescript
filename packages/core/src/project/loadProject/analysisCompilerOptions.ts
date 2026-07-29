import * as ts from "typescript"

// ParseForTypeErrors keeps type-bearing JSDoc because Policies do not consume full JSDoc trees.
export const withAnalysisCompilerOptions = (
  options: ts.CompilerOptions,
  required: ts.CompilerOptions
) => Object.assign({}, options, required)

export const createAnalysisProgram = (
  input: ts.CreateProgramOptions,
  requiredOptions: ts.CompilerOptions
) => {
  const options = withAnalysisCompilerOptions(input.options, requiredOptions)
  const host = ts.createCompilerHost(options)

  host.jsDocParsingMode = ts.JSDocParsingMode.ParseForTypeErrors

  return ts.createProgram({ ...input, options, host })
}
