import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

export interface TicketRow {
  readonly id: string
  readonly assigneeId: string | null
  readonly status: "open" | "pending" | "closed"
  readonly priority: number
}

const isActive = (row: TicketRow) => row.status !== "closed"

export const assigneeWorkload = (teamId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const rows = yield* sql<TicketRow>`select id, assignee_id, status, priority from tickets where team_id = ${teamId}`
    const activeAssigneeIds = rows.filter(isActive).flatMap((row) => (row.assigneeId === null ? [] : [row.assigneeId]))
    const counts = new Map<string, number>()
    for (const assigneeId of activeAssigneeIds) {
      counts.set(assigneeId, (counts.get(assigneeId) ?? 0) + 1)
    }
    return counts
  })

export const unassignedUrgent = (teamId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const rows = yield* sql<TicketRow>`select id, assignee_id, status, priority from tickets where team_id = ${teamId}`
    return rows.filter((row) => isActive(row) && row.assigneeId === null && row.priority >= 3)
  })
