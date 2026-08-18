import { Tuple, Array, HashMap, Option, Schema, Struct, pipe } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence/strictEqual"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { FileDetections } from "@better-typescript/core/engine/derive/fileDetections"
import { byFile, makeCountSummary } from "@better-typescript/core/engine/derive/byFile"
import { deriveSignals } from "@better-typescript/core/engine/derive/deriveSignals"
import { evidenceFromCounts } from "@better-typescript/core/engine/derive/evidenceFromCounts"
import { parentDirectories } from "@better-typescript/core/engine/derive/parentDirectories"
import { type NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makePackageExamples } from "../makePackageExamples.js"

const DirectorySignals = Schema.Struct({
  path: Schema.String,
  files: Schema.Array(FileDetections),
  projectTotal: Schema.Number
})

interface DirectorySignals extends Schema.Schema.Type<typeof DirectorySignals> {}

export const hotSubsystemExamples = makePackageExamples("hot-subsystem")

const isHotSubsystem = (directory: DirectorySignals) => {
  const elements = Array.flatMap(directory.files, Struct.get("elements"))
  const hasEnoughSignals = elements.length >= 25
  const hasEnoughFiles = directory.files.length >= 3
  const hasProjectShare = elements.length * 5 >= directory.projectTotal * 3
  const signalsEvidence = Array.make(hasEnoughSignals, hasEnoughFiles, hasProjectShare)

  return Array.every(signalsEvidence, Boolean)
}

const makeSubsystemAdvice = (directory: DirectorySignals) => {
  const elements = Array.flatMap(directory.files, Struct.get("elements"))
  const summary = makeCountSummary(elements)
  const policyEvidence = evidenceFromCounts(summary.countsByPolicy)

  const sharePercent =
    directory.projectTotal > 0 ? Math.floor((summary.total * 100) / directory.projectTotal) : 0

  const signalsItem = EvidenceItem.make({ measure: "signals", count: summary.total })

  const filesItem = EvidenceItem.make({
    measure: "files-with-signals",
    count: directory.files.length
  })

  const shareItem = EvidenceItem.make({ measure: "share(signals)", count: sharePercent })
  const leadingEvidence = Array.make(signalsItem, filesItem, shareItem)
  const evidence = Array.appendAll(leadingEvidence, policyEvidence)
  const location = Location.make({ path: directory.path })

  return Advice.make({
    location,
    level: "directory",
    title: "hot subsystem",
    remediation:
      "Signals concentrate in this directory: treat it as one subsystem to invert, not a " +
      "pile of files to patch. Give the subsystem a Layer of its own, move shared state " +
      "into Refs and PubSubs behind that Layer, and enter the runtime once at the " +
      "subsystem's edge.",
    evidence,
    examples: hotSubsystemExamples
  })
}

const hotSubsystemAdvice = (signals: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const files = byFile(signals)
  const projectElements = Array.flatMap(files, Struct.get("elements"))

  const directoryEntries = Array.flatMap(files, (file) => {
    const parents = parentDirectories(file.path)
    const isNestedDirectory = (directory: string) => directory.includes("/")
    const directories = Array.filter(parents, isNestedDirectory)
    const entryForDirectory = (directory: string) => Tuple.make(directory, file)
    const entries = Array.map(directories, entryForDirectory)

    return entries
  })

  const directoryNamesWithDuplicates = Array.map(directoryEntries, Tuple.get(0))
  const directoryNames = Array.dedupe(directoryNamesWithDuplicates)

  const emptyDirectoryFiles: HashMap.HashMap<
    string,
    ReadonlyArray<FileDetections>
  > = HashMap.empty()

  const directoryFiles = Array.reduce(directoryEntries, emptyDirectoryFiles, (groups, entry) => {
    const path = Tuple.get(entry, 0)
    const filesOption = HashMap.get(groups, path)

    const filesForDirectory = pipe(
      filesOption,
      Option.getOrElse((): ReadonlyArray<FileDetections> => Array.empty())
    )

    const file = Tuple.get(entry, 1)
    const groupedFiles = Array.append(filesForDirectory, file)

    return HashMap.set(groups, path, groupedFiles)
  })

  const directories = Array.map(directoryNames, (path) => {
    const filesOption = HashMap.get(directoryFiles, path)

    const belongingFiles = pipe(
      filesOption,
      Option.getOrElse((): ReadonlyArray<FileDetections> => Array.empty())
    )

    return DirectorySignals.make({
      path,
      files: belongingFiles,
      projectTotal: projectElements.length
    })
  })

  const hotDirectories = Array.filter(directories, isHotSubsystem)

  const deepest = Array.filter(hotDirectories, (candidate) => {
    const hasHotDescendant = Array.some(hotDirectories, (directory) => {
      const isDifferentPath = !strictEqual(directory.path)(candidate.path)
      const isNestedPath = directory.path.startsWith(`${candidate.path}/`)
      const conditions = Array.make(isDifferentPath, isNestedPath)
      return Array.every(conditions, Boolean)
    })

    return !hasHotDescendant
  })

  return Array.map(deepest, makeSubsystemAdvice)
}

export const hotSubsystem = deriveSignals(hotSubsystemAdvice)
