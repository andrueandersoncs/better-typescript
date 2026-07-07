import { Array, Schema, Stream, Struct } from "effect"
import {
  AdviceElement,
  FileDetections,
  adviceLocation,
  byFile,
  countSummary,
  deriveSignals,
  evidenceFromCounts,
  evidenceItem,
  parentDirectories
} from "../detectors/summary.js"
import type { NamedDetection } from "../detectors/summary.js"

const fileDetectionsArray = Schema.Array(FileDetections)

class DirectorySignals extends Schema.Class<DirectorySignals>(
  "DirectorySignals"
)({
  path: Schema.String,
  files: fileDetectionsArray,
  projectTotal: Schema.Number
}) {}

const fileDirectoryEntry = (
  file: FileDetections
): ReadonlyArray<readonly [string, FileDetections]> => {
  const directories = parentDirectories(file.path)

  return Array.map(directories, (directory) => [directory, file] as const)
}

const directorySignals =
  (files: ReadonlyArray<FileDetections>) =>
  (projectTotal: number) =>
  (path: string): DirectorySignals => {
    const belongingFiles = Array.filter(files, (file) =>
      parentDirectories(file.path).includes(path)
    )

    return new DirectorySignals({ path, files: belongingFiles, projectTotal })
  }

const isHotSubsystem = (directory: DirectorySignals): boolean => {
  const elements = Array.flatMap(directory.files, Struct.get("elements"))
  const total = elements.length
  const hasEnoughSignals = total >= 25
  const hasEnoughFiles = directory.files.length >= 3
  const hasProjectShare = total * 5 >= directory.projectTotal * 3

  return [hasEnoughSignals, hasEnoughFiles, hasProjectShare].every(Boolean)
}

const isDeepestHotSubsystem =
  (directories: ReadonlyArray<DirectorySignals>) =>
  (candidate: DirectorySignals): boolean => {
    const hasHotDescendant = Array.some(directories, (directory) => {
      const isDifferentPath = directory.path !== candidate.path
      const isNestedPath = directory.path.startsWith(`${candidate.path}/`)

      return [isDifferentPath, isNestedPath].every(Boolean)
    })

    return !hasHotDescendant
  }

const subsystemAdvice = (directory: DirectorySignals): AdviceElement => {
  const elements = Array.flatMap(directory.files, Struct.get("elements"))
  const summary = countSummary(elements)
  const ruleEvidence = evidenceFromCounts(summary.countsByRule)
  const sharePercent =
    directory.projectTotal > 0
      ? Math.floor((summary.total * 100) / directory.projectTotal)
      : 0
  const signalsItem = evidenceItem("signals", summary.total)
  const filesItem = evidenceItem("files-with-signals", directory.files.length)
  const shareItem = evidenceItem("share(signals)", sharePercent)
  const leadingEvidence = [signalsItem, filesItem, shareItem]
  const evidence = Array.appendAll(leadingEvidence, ruleEvidence)
  const location = adviceLocation(directory.path)

  return new AdviceElement({
    location,
    level: "directory",
    title: "hot subsystem",
    remediation:
      "Signals concentrate in this directory: treat it as one subsystem to invert, not a " +
      "pile of files to patch. Give the subsystem a Layer of its own, move shared state " +
      "into Refs and PubSubs behind that Layer, and enter the runtime once at the " +
      "subsystem's edge.",
    evidence
  })
}

const hotSubsystemAdvice = (
  signals: ReadonlyArray<NamedDetection>
): ReadonlyArray<AdviceElement> => {
  const files = byFile(signals)
  const projectTotal = Array.flatMap(files, Struct.get("elements")).length
  const directoryEntries = Array.flatMap(files, fileDirectoryEntry)
  const directoryNames = Array.map(directoryEntries, (entry) => entry[0])
  const uniqueDirectories = Array.dedupe(directoryNames)
  const directories = Array.map(
    uniqueDirectories,
    directorySignals(files)(projectTotal)
  )
  const hotDirectories = Array.filter(directories, isHotSubsystem)
  const deepest = Array.filter(
    hotDirectories,
    isDeepestHotSubsystem(hotDirectories)
  )

  return Array.map(deepest, subsystemAdvice)
}

export const hotSubsystem = (
  signals: Stream.Stream<NamedDetection, Error>
): Stream.Stream<AdviceElement, Error> =>
  deriveSignals(hotSubsystemAdvice)(signals)
