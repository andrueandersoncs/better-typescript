import type { HashMap } from "effect"
import type { Detection } from "../location/detectionData.js"

// MutableSeenBuckets dedupes detections because collection spans many projects.
export type MutableSeenBuckets = ReadonlyArray<HashMap.HashMap<string, ReadonlyArray<Detection>>>
