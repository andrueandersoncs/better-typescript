import { Tuple, Array, HashMap, Option, Struct, pipe } from "effect"
import { Advice, FileDetections } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  byFile,
  countSummary,
  deriveSignals,
  evidenceFromCounts,
  evidenceItem,
  parentDirectories
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { DirectorySignals } from "./data.js"

export const hotSubsystemExamples = packageExamples("hot-subsystem")

const isHotSubsystem = (directory: DirectorySignals) => {
  const elements = Array.flatMap(directory.files, Struct.get("elements"))
  const total = elements.length
  const hasEnoughSignals = total >= 25
  const hasEnoughFiles = directory.files.length >= 3
  const hasProjectShare = total * 5 >= directory.projectTotal * 3
  const signalsEvidence = Array.make(hasEnoughSignals, hasEnoughFiles, hasProjectShare)

  return Array.every(signalsEvidence, Boolean)
}

const subsystemAdvice = (directory: DirectorySignals) => {
  const elements = Array.flatMap(directory.files, Struct.get("elements"))
  const summary = countSummary(elements)
  const checkEvidence = evidenceFromCounts(summary.countsByCheck)

  const sharePercent =
    directory.projectTotal > 0 ? Math.floor((summary.total * 100) / directory.projectTotal) : 0

  const signalsItem = evidenceItem("signals", summary.total)
  const filesItem = evidenceItem("files-with-signals", directory.files.length)
  const shareItem = evidenceItem("share(signals)", sharePercent)
  const leadingEvidence = Array.make(signalsItem, filesItem, shareItem)
  const evidence = Array.appendAll(leadingEvidence, checkEvidence)
  const location = adviceLocation(directory.path)
  const examples = hotSubsystemExamples

  return new Advice({
    location,
    level: "directory",
    title: "hot subsystem",
    remediation:
      "Signals concentrate in this directory: treat it as one subsystem to invert, not a " +
      "pile of files to patch. Give the subsystem a Layer of its own, move shared state " +
      "into Refs and PubSubs behind that Layer, and enter the runtime once at the " +
      "subsystem's edge.",
    evidence,
    examples
  })
}

const hotSubsystemAdvice = (signals: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const files = byFile(signals)
  const projectElements = Array.flatMap(files, Struct.get("elements"))
  const projectTotal = projectElements.length

  const directoryEntries = Array.flatMap(files, (file) => {
    const directories = parentDirectories(file.path)
    const entries = Array.map(directories, (directory) => Tuple.make(directory, file))

    return entries
  })

  const directoryNamesWithDuplicates = Array.map(directoryEntries, (entry) => entry[0])
  const directoryNames = Array.dedupe(directoryNamesWithDuplicates)

  const emptyDirectoryFiles: HashMap.HashMap<
    string,
    ReadonlyArray<FileDetections>
  > = HashMap.empty()

  const directoryFiles = Array.reduce(directoryEntries, emptyDirectoryFiles, (groups, entry) => {
    const path = entry[0]
    const filesOption = HashMap.get(groups, path)

    const filesForDirectory = pipe(
      filesOption,
      Option.getOrElse((): ReadonlyArray<FileDetections> => Array.empty())
    )

    const groupedFiles = Array.append(filesForDirectory, entry[1])

    return HashMap.set(groups, path, groupedFiles)
  })

  const directories = Array.map(directoryNames, (path) => {
    const filesOption = HashMap.get(directoryFiles, path)

    const belongingFiles = pipe(
      filesOption,
      Option.getOrElse((): ReadonlyArray<FileDetections> => Array.empty())
    )

    return new DirectorySignals({
      path,
      files: belongingFiles,
      projectTotal
    })
  })

  const hotDirectories = Array.filter(directories, isHotSubsystem)

  const deepest = Array.filter(hotDirectories, (candidate) => {
    const hasHotDescendant = Array.some(hotDirectories, (directory) => {
      const isDifferentPath = directory.path !== candidate.path
      const isNestedPath = directory.path.startsWith(`${candidate.path}/`)
      const conditions = Array.make(isDifferentPath, isNestedPath)
      return Array.every(conditions, Boolean)
    })

    return !hasHotDescendant
  })

  return Array.map(deepest, subsystemAdvice)
}

export const hotSubsystem = deriveSignals(hotSubsystemAdvice)
