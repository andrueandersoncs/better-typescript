import { Array, Function } from "effect"
import type { Detection } from "../location/detectionData.js"

const emptyDetections = Array.empty<Detection>()

export const noDetections = Function.constant(emptyDetections)
