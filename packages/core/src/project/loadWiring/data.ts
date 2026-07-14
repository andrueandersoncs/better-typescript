import { Data, Schema } from "effect"

export const configFileName = "better-typescript.config.ts"

/**
 * ConfigExportName is the shared length contract used by callFactory, ConfigExport, and
 * ownConfigExport.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export type ConfigExportName = "default" | "wiring"

/**
 * ConfigExport is the shared name, value contract used by configExportFromRecord and
 * configExport.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class ConfigExport extends Data.Class<{
  readonly name: ConfigExportName
  readonly value: unknown
}> {}

/**
 * ProjectWiringError is the shared configPath, reason, name, stack contract used by
 * projectWiringError, loadWiring, and failConfig.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class ProjectWiringError extends Schema.TaggedError<ProjectWiringError>(
  "ProjectWiringError"
)("ProjectWiringError", {
  configPath: Schema.String,
  reason: Schema.String
}) {
  get message(): string {
    return `Invalid ${configFileName} at ${this.configPath}: ${this.reason}`
  }
}
