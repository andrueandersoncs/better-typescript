import * as path from "node:path"
import { Array, Equal, pipe } from "effect"
import { strictEqual } from "../equivalence.js"
import { Detection } from "./data.js"

export const toRelativeFileName = (projectRoot: string) => (fileName: string) => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}

export const countDetectionsAtPath = (pathName: string) => (elements: ReadonlyArray<Detection>) => {
  const matchesPath = (element: Detection) => strictEqual(pathName)(element.location.path)
  const atPath = Array.filter(elements, matchesPath)

  return atPath.length
}

export const detectionEquals = (a: Detection, b: Detection) => {
  const samePath = strictEqual(b.location.path)(a.location.path)
  const sameLine = strictEqual(b.location.line)(a.location.line)
  const sameColumn = strictEqual(b.location.column)(a.location.column)
  const sameMessage = strictEqual(b.message)(a.message)
  const sameHint = strictEqual(b.hint)(a.hint)
  const bothStructural = Equal.isEqual(a.data) && Equal.isEqual(b.data)
  const identical = strictEqual(b.data)(a.data)
  const sameData = bothStructural ? Equal.equals(a.data, b.data) : identical
  const conditions = Array.make(samePath, sameLine, sameColumn, sameMessage, sameHint, sameData)

  return Array.every(conditions, Boolean)
}

export const detectionBlockKey = (element: Detection) => {
  const detectionIdentityParts = Array.make(element.message, element.hint)

  return pipe(Array.prepend(detectionIdentityParts, "detection"), JSON.stringify)
}

export const locationText = (element: Detection) =>
  `  ${element.location.path}:${element.location.line}:${element.location.column}`
