import { Array, Effect, Result, Struct, flow } from "effect"
import type * as ts from "typescript"
import { compilerOptionsForPolicies } from "../policy/policy.js"
import { Signal } from "../signal/data.js"
import {
  InvalidWiringFilesError,
  Wiring,
  WiringEntry,
  WiringEntryInput,
  WiringFilesInput,
  isProgramPolicy,
  type WiringConfig
} from "./data.js"
import { compileGlobPattern, isFileGlob as fileGlobPredicate } from "./globs.js"
import { validatePolicyNames } from "./names.js"
import { workspaceSignalsForProjects as collectWorkspaceSignalsForProjects } from "./collect.js"

export const isFileGlob = fileGlobPredicate
export const workspaceSignalsForProjects = collectWorkspaceSignalsForProjects

const programPoliciesFromEntry = (entry: WiringEntry) =>
  Array.filter(entry.wiring.policies, isProgramPolicy)

// Compiler options follow program Policy order because matchers own analysis semantics.
export const compilerOptionsForConfig: (config: WiringConfig) => ts.CompilerOptions = flow(
  Array.flatMap(programPoliciesFromEntry),
  compilerOptionsForPolicies
)

const failInvalidWiringFiles = (indexes: ReadonlyArray<number>) => {
  const error = new InvalidWiringFilesError({ indexes })
  const failure = Effect.fail(error)

  return Effect.runSync(failure)
}

// Validation runs at construction because duplicate names must fail before analysis starts.
export const makeWiring = (definition: Pick<Wiring, "policies" | "derive">) => {
  const wiring = new Wiring(definition)

  return validatePolicyNames(wiring.policies, wiring)
}

// Merged derive preserves member order because later advice must not reorder earlier emissions.
export const makeMergedWiring = (wirings: ReadonlyArray<Wiring>) => {
  const policies = Array.flatMap(wirings, Struct.get("policies"))
  const applyDerive = (signals: ReadonlyArray<Signal>) => (wiring: Wiring) => wiring.derive(signals)
  const derive: Wiring["derive"] = (signals) => Array.flatMap(wirings, applyDerive(signals))

  return makeWiring({ policies, derive })
}

const makeWiringFilesInput = (files: Array.NonEmptyReadonlyArray<string>) =>
  new WiringFilesInput({ files })

const makeWiringEntryInput = (entry: Pick<WiringEntryInput, "files" | "wiring">) =>
  new WiringEntryInput({ files: entry.files, wiring: entry.wiring })

const isValidWiringFilesInput = (entry: WiringFilesInput) => {
  const hasFiles = entry.files.length > 0
  const hasOnlyNonEmptyPatterns = Array.every(entry.files, isFileGlob)
  const conditions = Array.make(hasFiles, hasOnlyNonEmptyPatterns)

  return Array.every(conditions, Boolean)
}

const compileEntryGlobs = (entry: WiringEntryInput) => {
  Array.forEach(entry.files, compileGlobPattern)
  const wiring = makeWiring(entry.wiring)

  return new WiringEntry({
    files: entry.files,
    wiring
  })
}

const invalidConfigIndex = (entry: WiringEntryInput, index: number) => {
  const filesInput = makeWiringFilesInput(entry.files)
  const isValid = isValidWiringFilesInput(filesInput)

  return isValid ? Result.failVoid : Result.succeed(index)
}

const entryPolicies = (entry: WiringEntry) => entry.wiring.policies

// Glob compilation happens at config load because invalid patterns must not fail mid-analysis.
export const defineConfig = (
  config: ReadonlyArray<Pick<WiringEntryInput, "files" | "wiring">>
): WiringConfig => {
  const inputs = Array.map(config, makeWiringEntryInput)
  const invalidIndexes = Array.filterMap(inputs, invalidConfigIndex)

  if (invalidIndexes.length > 0) {
    return failInvalidWiringFiles(invalidIndexes)
  }

  const entries = Array.map(inputs, compileEntryGlobs)
  const policies = Array.flatMap(entries, entryPolicies)

  return validatePolicyNames(policies, entries)
}
