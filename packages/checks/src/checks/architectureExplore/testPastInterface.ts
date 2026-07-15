import { Array, Function, Option, Result, Struct, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { seamLeakageDataOf, testOnlyExportDataOf } from "./evidence.js"

export const testPastInterfaceExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("test-past-interface")

const testPastInterfaceAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const testOnlyExports = Array.filter(elements, (element) => element.name === "test-only-exports")

  const testImports = pipe(
    elements,
    Array.filter((element) => element.name === "seam-leakage-evidence"),
    Array.filter((element) =>
      pipe(seamLeakageDataOf(element), Option.exists(Struct.get("fromTest")))
    )
  )

  const paths = pipe(
    Array.appendAll(testOnlyExports, testImports),
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.map(paths, (filePath) => {
    const exportsAtPath = Array.filter(
      testOnlyExports,
      (element) => element.detection.location.path === filePath
    )

    const importsAtPath = Array.filter(
      testImports,
      (element) => element.detection.location.path === filePath
    )

    const testCallCount = pipe(
      exportsAtPath,
      Array.filterMap(Function.flow(testOnlyExportDataOf, Result.fromOption(Function.constVoid))),
      Array.reduce(0, (total, data) => total + data.testCallCount)
    )

    const location = adviceLocation(filePath)
    const exportsItem = evidenceItem("test-only-exports", exportsAtPath.length)
    const callsItem = evidenceItem("test-helper-calls", testCallCount)
    const importsItem = evidenceItem("test-deep-imports", importsAtPath.length)
    const evidence = Array.make(exportsItem, callsItem, importsItem)

    return new Advice({
      location,
      level: "file",
      title: "test past interface",
      remediation:
        "Tests and production callers must cross the same interface. Exercise observable behaviour through the public Module, " +
        "make test-only helpers private, and replace internal/source imports with the declared seam.",
      evidence,
      examples: testPastInterfaceExamples
    })
  })
}

export const testPastInterface = deriveSignals(testPastInterfaceAdvice)
