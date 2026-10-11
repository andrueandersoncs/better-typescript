import { IsoDateTimeStringSchema, UUIDSchema } from "@herd-labs/schemas";
import { Schema } from "effect";

export const MonitorVersionIdParamsSchema = Schema.Struct({
  id: UUIDSchema,
});

export const ReviewMonitorVersionBodySchema = Schema.Struct({
  notes: Schema.optional(Schema.String),
});

export const ReviewMonitorVersionResponseSchema = Schema.Struct({
  applied: Schema.Literal(true),
  warnings: Schema.Array(Schema.String),
});

export const RevertMonitorVersionResponseSchema = Schema.Struct({
  applied: Schema.Literal(true),
});

const MonitorReviewWarningSchema = Schema.Struct({
  reason: Schema.String,
  versionId: Schema.String,
});

export const BulkApproveMonitorVersionsRequestSchema = Schema.Struct({
  monitorVersionIds: Schema.Array(UUIDSchema).check(Schema.isMinLength(1)),
  notes: Schema.optional(Schema.String),
});

export const BulkApproveMonitorVersionsResponseSchema = Schema.Struct({
  approved: Schema.Finite,
  warnings: Schema.Array(MonitorReviewWarningSchema),
});

export const BulkRejectMonitorVersionsRequestSchema = Schema.Struct({
  monitorVersionIds: Schema.Array(UUIDSchema).check(Schema.isMinLength(1)),
  notes: Schema.optional(Schema.String),
});

export const BulkRejectMonitorVersionsResponseSchema = Schema.Struct({
  rejected: Schema.Finite,
  warnings: Schema.Array(MonitorReviewWarningSchema),
});

export const BulkRevertMonitorVersionsRequestSchema = Schema.Struct({
  monitorVersionIds: Schema.Array(UUIDSchema).check(Schema.isMinLength(1)),
});

export const BulkRevertMonitorVersionsResponseSchema = Schema.Struct({
  reverted: Schema.Finite,
  warnings: Schema.Array(MonitorReviewWarningSchema),
});

export const TestMonitorVersionResponseSchema = Schema.Struct({
  id: UUIDSchema,
  lastError: Schema.NullOr(Schema.String),
  lastPollAt: Schema.NullOr(IsoDateTimeStringSchema),
  lastPolledValue: Schema.NullOr(Schema.String),
  lastTestAt: IsoDateTimeStringSchema,
  lastTestStatus: Schema.Literal("completed"),
});
