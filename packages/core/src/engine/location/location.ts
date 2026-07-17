import * as path from "node:path"
import { Array, Equal, pipe } from "effect"
import { Detection } from "./data.js"

export const toRelativeFileName = (projectRoot: string) => (fileName: string) => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}

export const detectionAtPath = (pathName: string) => (element: Detection) =>
  element.location.path === pathName

export const countDetectionsAtPath = (pathName: string) => (elements: ReadonlyArray<Detection>) => {
  const atPath = Array.filter(elements, detectionAtPath(pathName))

  return atPath.length
}

export const detectionEquals = (a: Detection, b: Detection) => {
  const samePath = a.location.path === b.location.path
  const sameLine = a.location.line === b.location.line
  const sameColumn = a.location.column === b.location.column
  const sameMessage = a.message === b.message
  const sameHint = a.hint === b.hint
  const bothStructural = Equal.isEqual(a.data) && Equal.isEqual(b.data)
  const identical = a.data === b.data
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
