import { Data, Schema } from "effect"

export const configFileName = "better-typescript.config.ts"

/**
 * ConfigExportName is the accepted export-name protocol for project wiring
 * configuration modules.
 *
 * @modelRole protocol
 * @remarks It remains explicit because module inspection and configuration
 * authors must agree on `default` and `config`. Removing it would duplicate the
 * accepted-name union and allow loader branches to drift.
 */
export type ConfigExportName = "default" | "config"

/**
 * ConfigExport pairs an accepted configuration export name with its unvalidated
 * module value.
 *
 * @modelRole shared
 * @remarks It remains explicit because module discovery and schema validation
 * exchange both values before the export is trusted. Removing it would split
 * the pair into positional values or repeat anonymous boundary objects.
 */
export class ConfigExport extends Data.Class<{
  readonly name: ConfigExportName
  readonly value: unknown
}> {}

/**
 * ProjectWiringConfigError is the failure protocol for loading one project's
 * wiring configuration module.
 *
 * @modelRole protocol
 * @remarks It remains explicit because the loader and CLI need the failing path
 * and reason as structured data. Removing it would collapse those fields into
 * prose and force boundary consumers to parse an unstable message.
 */
export class ProjectWiringConfigError extends Schema.TaggedError<ProjectWiringConfigError>(
  "ProjectWiringConfigError"
)("ProjectWiringConfigError", {
  configPath: Schema.String,
  reason: Schema.String
}) {
  get message(): string {
    return `Invalid ${configFileName} at ${this.configPath}: ${this.reason}`
  }
}
