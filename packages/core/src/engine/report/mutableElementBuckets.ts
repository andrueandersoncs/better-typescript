import type { MutableList } from "effect"
import type { Detection } from "../location/detectionData.js"

// MutableElementBuckets stores detections because collection appends across projects.
export type MutableElementBuckets = ReadonlyArray<MutableList.MutableList<Detection>>
