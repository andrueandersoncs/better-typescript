export type AuditRecord = {
  readonly receivedAtIso: string;
  readonly sourceTimestampIso: string;
};

// Weekly reporting uses the receipt timestamp recorded locally.
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
