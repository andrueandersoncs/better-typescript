import { Array, Effect, Equal, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { type Policy } from "../../engine/policy/policyClass.js"
import { type Detection } from "../../engine/location/detectionData.js"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { compilerOptionsForPolicies } from "../../engine/policy/compilerOptionsForPolicies.js"
import { toPolicies } from "../../engine/policy/locateTarget.js"
import { type LoadedProject } from "./loadedProject.js"
import { createAnalysisProgram } from "./createAnalysisProgram.js"

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)
const includeEverySourceFile = Function.constant(true)

// programForPolicy owns compiler requirements because callers should not know Policy internals.
const programForPolicy =
  (policy: Policy) =>
  (program: ts.Program): ts.Program => {
    const policies = Array.of(policy)
    const compilerOptions = compilerOptionsForPolicies(policies)
    const currentOptions = program.getCompilerOptions()

    const optionMatches = ([name, value]: [string, unknown]) => {
      const currentValue = Reflect.get(currentOptions, name)

      return Equal.equals(currentValue, value)
    }

    const compilerOptionEntries = Object.entries(compilerOptions)
    const alreadyConfigured = pipe(compilerOptionEntries, Array.every(optionMatches))

    if (alreadyConfigured) {
      return program
    }

    const rootNames = program.getRootFileNames()
    const projectReferences = program.getProjectReferences()

    return createAnalysisProgram(
      {
        rootNames,
        options: currentOptions,
        projectReferences
      },
      compilerOptions
    )
  }

export const runPolicyOnProject =
  (policy: Policy) =>
  (project: LoadedProject): Effect.Effect<ReadonlyArray<Detection>> =>
    Effect.sync(() => {
      const program = programForPolicy(policy)(project.program)
      const createContext = makeContext(project.rootPath)
      const context = createContext(program)
      const policies = Array.of(policy)
      const policiesInEveryFile = toPolicies(policies)(includeEverySourceFile)
      const detections = policiesInEveryFile(context)

      return pipe(detections, Array.head, Option.getOrElse(noDetections))
    })
