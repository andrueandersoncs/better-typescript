import { Effect } from "effect"
import { WorkspaceRepo } from "./WorkspaceRepo"
import { AuditLog } from "./AuditLog"

export interface PurgeOptions {
  readonly includeArchived: boolean
  readonly hardDelete: boolean
}

export interface PurgeSummary {
  readonly workspaceId: string
  readonly removedProjects: number
}

const listTargets = (workspaceId: string, includeArchived: boolean) =>
  Effect.gen(function* () {
    const repo = yield* WorkspaceRepo
    const projects = yield* repo.listProjects(workspaceId)
    return includeArchived ? projects : projects.filter((p) => !p.archived)
  })

export const purgeWorkspaceProjects = (
  workspaceId: string,
  options: PurgeOptions,
) =>
  Effect.gen(function* () {
    const repo = yield* WorkspaceRepo
    const audit = yield* AuditLog
    const targets = yield* listTargets(workspaceId, options.includeArchived)
    for (const project of targets) {
      if (options.hardDelete) {
        yield* repo.destroyProject(project.id)
      } else {
        yield* repo.markProjectDeleted(project.id)
      }
    }
    yield* audit.record("workspace.purge", { workspaceId, count: targets.length })
    return { workspaceId, removedProjects: targets.length } satisfies PurgeSummary
  })
