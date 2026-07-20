import * as path from "node:path"
import { Array, Equal, pipe } from "effect"
import { strictEqual } from "../equivalence.js"
import { Detection } from "./data.js"

export const toRelativeFileName = (projectRoot: string) => (fileName: string) => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}

export const countDetectionsAtPath = (pathName: string) => (elements: ReadonlyArray<Detection>) => {
  const matchesPath = (element: Detection) => strictEqual(element.location.path, pathName)
  const atPath = Array.filter(elements, matchesPath)

  return atPath.length
}

export const detectionEquals = (a: Detection, b: Detection) => {
  const samePath = strictEqual(a.location.path, b.location.path)
  const sameLine = strictEqual(a.location.line, b.location.line)
  const sameColumn = strictEqual(a.location.column, b.location.column)
  const sameMessage = strictEqual(a.message, b.message)
  const sameHint = strictEqual(a.hint, b.hint)
  const bothStructural = Equal.isEqual(a.data) && Equal.isEqual(b.data)
  const identical = strictEqual(a.data, b.data)
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
