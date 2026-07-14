import { Schema } from "effect"
import { FileDetections } from "@better-typescript/core/engine/derive/data"

const fileDetectionsArray = Schema.Array(FileDetections)

/**
 * DirectorySignals is the shared path, files, projectTotal contract used by
 * subsystemAdvice, hotSubsystemAdvice, and isHotSubsystem.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class DirectorySignals extends Schema.Class<DirectorySignals>(
  "DirectorySignals"
)({
  path: Schema.String,
  files: fileDetectionsArray,
  projectTotal: Schema.Number
}) {}
