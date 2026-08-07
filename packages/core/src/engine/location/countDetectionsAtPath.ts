import { Array } from "effect"
import { strictEqual } from "../equivalence/strictEqual.js"
import type { Detection } from "./detectionData.js"

export const countDetectionsAtPath = (pathName: string) => (elements: ReadonlyArray<Detection>) => {
  const matchesPath = (element: Detection) => strictEqual(pathName)(element.location.path)
  const atPath = Array.filter(elements, matchesPath)

  return atPath.length
}
