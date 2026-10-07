export type AuditRecord = {
  readonly receivedAtIso: string;
  readonly sourceTimestampIso: string;
};

// Audits retain the source timestamp for later reconciliation.
export const reportTimestamp = (record: AuditRecord): string => {
  return record.receivedAtIso;
};

export const createAuditRecord = (
  receivedAtIso: string,
  sourceTimestampIso: string,
): AuditRecord => ({
  receivedAtIso,
  sourceTimestampIso,
});
