import * as path from "node:path"
import { Array, Equal, pipe } from "effect"
import { NamedDetection } from "../derive/data.js"
import { Detection } from "./data.js"

export const toRelativeFileName =
  (projectRoot: string) =>
  (fileName: string): string => {
    const relative = path.relative(projectRoot, fileName)

    return relative || fileName
  }

export const namedDetection =
  (name: string) =>
  (detectionValue: Detection): NamedDetection =>
    new NamedDetection({ name, detection: detectionValue })

export const detectionAtPath =
  (pathName: string) =>
  (element: Detection): boolean =>
    element.location.path === pathName

export const detectionsAtPath =
  (pathName: string) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<Detection> =>
    Array.filter(elements, detectionAtPath(pathName))

export const countDetectionsAtPath =
  (pathName: string) =>
  (elements: ReadonlyArray<Detection>): number =>
    detectionsAtPath(pathName)(elements).length

export const detectionEquals = (a: Detection, b: Detection): boolean => {
  const samePath = a.location.path === b.location.path
  const sameLine = a.location.line === b.location.line
  const sameColumn = a.location.column === b.location.column
  const sameMessage = a.message === b.message
  const sameHint = a.hint === b.hint
  const sameData = Equal.equals(a.data, b.data)
  const conditions = Array.make(samePath, sameLine, sameColumn, sameMessage, sameHint, sameData)

  return Array.every(conditions, Boolean)
}

export const detectionBlockKey = (element: Detection): string => {
  const detectionIdentityParts = Array.make(element.message, element.hint)

  return pipe(Array.prepend(detectionIdentityParts, "detection"), JSON.stringify)
}

export const locationText = (element: Detection): string =>
  `  ${element.location.path}:${element.location.line}:${element.location.column}`
