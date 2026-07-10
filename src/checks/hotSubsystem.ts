import { Array, HashMap, Option, Schema, Stream, Struct, pipe } from "effect"
import {
  Advice,
  FileDetections,
  adviceLocation,
  byFile,
  countSummary,
  deriveSignals,
  evidenceFromCounts,
  evidenceItem,
  parentDirectories
} from "../engine/derive.js"
import type { NamedDetection } from "../engine/derive.js"

const fileDetectionsArray = Schema.Array(FileDetections)

class DirectorySignals extends Schema.Class<DirectorySignals>(
  "DirectorySignals"
)({
  path: Schema.String,
  files: fileDetectionsArray,
  projectTotal: Schema.Number
}) {}

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

const subsystemAdvice = (directory: DirectorySignals): Advice => {
  const elements = Array.flatMap(directory.files, Struct.get("elements"))
  const summary = countSummary(elements)
  const checkEvidence = evidenceFromCounts(summary.countsByCheck)
  const sharePercent =
    directory.projectTotal > 0
      ? Math.floor((summary.total * 100) / directory.projectTotal)
      : 0
  const signalsItem = evidenceItem("signals", summary.total)
  const filesItem = evidenceItem("files-with-signals", directory.files.length)
  const shareItem = evidenceItem("share(signals)", sharePercent)
  const leadingEvidence = [signalsItem, filesItem, shareItem]
  const evidence = Array.appendAll(leadingEvidence, checkEvidence)
  const location = adviceLocation(directory.path)

  return new Advice({
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
): ReadonlyArray<Advice> => {
  const files = byFile(signals)
  const projectElements = Array.flatMap(files, Struct.get("elements"))
  const projectTotal = projectElements.length
  const directoryEntries = Array.flatMap(files, (file) => {
    const directories = parentDirectories(file.path)
    const entries = Array.map(
      directories,
      (directory) => [directory, file] as const
    )

    return entries
  })
  const directoryNamesWithDuplicates = Array.map(
    directoryEntries,
    (entry) => entry[0]
  )
  const directoryNames = Array.dedupe(directoryNamesWithDuplicates)
  const emptyDirectoryFiles: HashMap.HashMap<
    string,
    ReadonlyArray<FileDetections>
  > = HashMap.empty()
  const directoryFiles = Array.reduce(
    directoryEntries,
    emptyDirectoryFiles,
    (groups, entry) => {
      const path = entry[0]
      const filesOption = HashMap.get(groups, path)
      const filesForDirectory = pipe(
        filesOption,
        Option.getOrElse((): ReadonlyArray<FileDetections> => [])
      )
      const groupedFiles = Array.append(filesForDirectory, entry[1])

      return HashMap.set(groups, path, groupedFiles)
    }
  )
  const directories = Array.map(directoryNames, (path): DirectorySignals => {
    const filesOption = HashMap.get(directoryFiles, path)
    const belongingFiles = pipe(
      filesOption,
      Option.getOrElse((): ReadonlyArray<FileDetections> => [])
    )

    return new DirectorySignals({
      path,
      files: belongingFiles,
      projectTotal
    })
  })
  const hotDirectories = Array.filter(directories, isHotSubsystem)
  const deepest = Array.filter(
    hotDirectories,
    isDeepestHotSubsystem(hotDirectories)
  )

  return Array.map(deepest, subsystemAdvice)
}

export const hotSubsystem = (
  signals: Stream.Stream<NamedDetection, Error>
): Stream.Stream<Advice, Error> => deriveSignals(hotSubsystemAdvice)(signals)
