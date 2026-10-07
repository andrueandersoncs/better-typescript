type AuditEvent = {
  readonly actorId: string
  readonly action: string
  readonly occurredAt: string
}

export const auditEvents: ReadonlyArray<AuditEvent> = [
  { actorId: "user-42", action: "invoice.opened", occurredAt: "2025-05-10T09:00:00Z" },
  { actorId: "user-42", action: "invoice.sent", occurredAt: "2025-05-10T09:02:00Z" }
]

export const latestAuditEvent = (): AuditEvent => {
  return auditEvents[auditEvents.length - 1]!
}
