import { Array, Function } from "effect"
import type { Detection } from "../location/detectionData.js"

const emptyDetectionsBucket: ReadonlyArray<Detection> = Array.empty()
export const noDetections = Function.constant(emptyDetectionsBucket)
