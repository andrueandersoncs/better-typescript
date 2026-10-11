import { Schema } from "effect";

export const ToolNameSchema = Schema.Literal(
  "dune",
  "anthropic",
  "coingecko",
  "rpc",
  "herd-mcp",
  "ccip-directory",
);
export type Tool = Schema.Schema.Type<typeof ToolNameSchema>;

export type BroadcastCapable = {
  broadcastEvent: (event: { type: string; [key: string]: unknown }) => void | Promise<unknown>;
};

export type ToolCallContext = {
  agent: () => BroadcastCapable;
  env: Env;
  cfRunId: string;
  stepName: string;
  attempt: number | null;
};

const optionalString = Schema.optional(Schema.String);
const optionalNumber = Schema.optional(Schema.Number);
const statusLiteral = Schema.Literal("success", "failure");

export const ToolCallRecordSchema = Schema.Struct({
  toolCallId: Schema.String,
  tool: ToolNameSchema,
  stepName: Schema.String,
  attempt: Schema.Number,
  startedAt: Schema.Number,
  durationMs: Schema.Number,
  status: statusLiteral,
  inputHash: Schema.String,
  outputSummary: Schema.String,
  errorMessage: optionalString,
  costUsd: Schema.Number,
  mocked: Schema.Boolean,
  modelVersion: optionalString,
  promptTemplateHash: optionalString,
  methodologyContentHash: optionalString,
  tokensInput: optionalNumber,
  tokensOutput: optionalNumber,
  duneQueryId: optionalNumber,
  duneExecutionId: optionalString,
  duneRowCount: optionalNumber,
  duneCredits: optionalNumber,
  rpcChain: optionalString,
  rpcChainId: optionalNumber,
  rpcBlockNumber: optionalNumber,
  rpcBlockHash: optionalString,
});
export type ToolCallRecord = Schema.Schema.Type<typeof ToolCallRecordSchema>;

export type ToolResult<T> = T & {
  toolCallId: string;
  costUsd: number;
  mocked: boolean;
};
