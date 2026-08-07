import { Struct } from "effect"
import type { NamedDetection } from "./namedDetection.js"

export const namedDetectionName = Struct.get<NamedDetection, "name">("name")
