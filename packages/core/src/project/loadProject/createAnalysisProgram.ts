import * as ts from "typescript"
import { withAnalysisCompilerOptions } from "./withAnalysisCompilerOptions.js"

export const createAnalysisProgram = (
  input: ts.CreateProgramOptions,
  requiredOptions: ts.CompilerOptions
) => {
  const options = withAnalysisCompilerOptions(input.options, requiredOptions)
  const host = ts.createCompilerHost(options)

  host.jsDocParsingMode = ts.JSDocParsingMode.ParseForTypeErrors

  return ts.createProgram({ ...input, options, host })
}
