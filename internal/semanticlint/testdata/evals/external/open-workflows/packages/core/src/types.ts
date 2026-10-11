import { Data, Option, Schema, pipe } from "effect";

export const optionField = <A, I, R>(s: Schema.Schema<A, I, R>) => {
  const optional = Schema.optionalWith(s, { as: "Option" });
  return pipe(optional, Schema.withConstructorDefault(Option.none));
};

const alwaysFalse = (): boolean => false;

const markerBase = Schema.optionalWith(Schema.Boolean, { default: alwaysFalse });
const markerField = pipe(markerBase, Schema.withConstructorDefault(alwaysFalse));

const isCallableAs =
  <F>() =>
  (u: unknown): u is F =>
    typeof u === "function";

// Function types are JavaScript platform values — Schema.declare is appropriate for integrating types you don't own.
export const functionField = <F>() => Schema.declare(isCallableAs<F>());

const isLiveSchema = (u: unknown): u is Schema.Schema.Any => Schema.isSchema(u);

const schemaField = Schema.declare(isLiveSchema);

const stringOption = optionField(Schema.String);
const numberOption = optionField(Schema.Number);
const opaqueOption = optionField(Schema.Unknown);
const schemaOption = optionField(schemaField);

const retrySchedule = Schema.Literal("exponential", "spaced", "immediate");

export class RetryPolicy extends Schema.Class<RetryPolicy>("RetryPolicy")({
  times: Schema.Number,
  schedule: retrySchedule,

  baseMillis: numberOption,
}) {}

export type RetryPolicyInput = Schema.Schema.Encoded<typeof RetryPolicy>;

export class VerifyVotes extends Schema.Class<VerifyVotes>("VerifyVotes")({
  confirmed: Schema.Number,
  refuted: Schema.Number,
}) {}

const keepIfField = functionField<(votes: VerifyVotes) => boolean>();
const refutePromptField = functionField<(itemJson: string) => string>();
const refutePromptOption = optionField(refutePromptField);

export class VerifyOptions extends Schema.Class<VerifyOptions>("VerifyOptions")({
  refuters: Schema.Number,

  keepIf: keepIfField,

  refutePrompt: refutePromptOption,
}) {}

export type VerifyOptionsInput = Schema.Schema.Encoded<typeof VerifyOptions>;

export type Concurrency = "engine" | "unbounded" | number;

const engineBound = Schema.Literal("engine");
const unbounded = Schema.Literal("unbounded");
export const concurrencySchema: Schema.Schema<Concurrency> = Schema.Union(
  engineBound,
  unbounded,
  Schema.Number
);
const concurrencyOption = optionField(concurrencySchema);

export class ForEachOptions extends Schema.Class<ForEachOptions>("ForEachOptions")({
  concurrency: concurrencyOption,
}) {}

export type ForEachOptionsInput = Schema.Schema.Encoded<typeof ForEachOptions>;

export type Node =
  | StepNode
  | AgentNode
  | PureNode
  | FailNode
  | FlatMapNode
  | ParallelNode
  | ForEachNode
  | BranchNode
  | VerifyNode
  | UseNode
  | DynamicNode;

const nodeUnion = (): Schema.Schema<Node> => {
  const step = Schema.typeSchema(StepNode);
  const agent = Schema.typeSchema(AgentNode);
  const pure = Schema.typeSchema(PureNode);
  const fail = Schema.typeSchema(FailNode);
  const flatMap = Schema.typeSchema(FlatMapNode);
  const par = Schema.typeSchema(ParallelNode);
  const forEach = Schema.typeSchema(ForEachNode);
  const branch = Schema.typeSchema(BranchNode);
  const verify = Schema.typeSchema(VerifyNode);
  const use = Schema.typeSchema(UseNode);
  const dynamic = Schema.typeSchema(DynamicNode);
  return Schema.Union(step, agent, pure, fail, flatMap, par, forEach, branch, verify, use, dynamic);
};

const nodeSchema: Schema.Schema<Node> = Schema.suspend(nodeUnion);

const retryPolicyType = Schema.typeSchema(RetryPolicy);
const retryOption = optionField(retryPolicyType);

const isSymbolicTolerant =
  <T>() =>
  (_u: unknown): _u is T =>
    true;

const symbolicItems = Schema.declare(isSymbolicTolerant<ReadonlyArray<unknown>>());

const symbolicCond = Schema.declare(isSymbolicTolerant<boolean>());

const symbolicChildren = Schema.declare(isSymbolicTolerant<ReadonlyArray<Node>>());

export class StepNode extends Schema.TaggedClass<StepNode>("StepNode")("Step", {
  name: Schema.String,

  run: Schema.Unknown,
  retry: retryOption,
  compensate: opaqueOption,

  idempotencyKey: stringOption,
}) {}

export class AgentNode extends Schema.TaggedClass<AgentNode>("AgentNode")("Agent", {
  name: Schema.String,

  prompt: Schema.String,

  schema: schemaOption,
  model: stringOption,

  maxTokens: numberOption,
  retry: retryOption,

  idempotencyKey: stringOption,
}) {}

export class PureNode extends Schema.TaggedClass<PureNode>("PureNode")("Pure", {
  value: Schema.Unknown,
}) {}

export class FailNode extends Schema.TaggedClass<FailNode>("FailNode")("Fail", {
  error: Schema.Unknown,
}) {}

const continuationField = functionField<(a: unknown) => Node>();

export class FlatMapNode extends Schema.TaggedClass<FlatMapNode>("FlatMapNode")("FlatMap", {
  first: nodeSchema,

  f: continuationField,
}) {}

export class ParallelNode extends Schema.TaggedClass<ParallelNode>("ParallelNode")("Parallel", {
  children: symbolicChildren,
}) {}

const forEachBody = functionField<(item: unknown, index: number) => Node>();
const forEachOptionsField = Schema.typeSchema(ForEachOptions);

export class ForEachNode extends Schema.TaggedClass<ForEachNode>("ForEachNode")("ForEach", {
  items: symbolicItems,
  body: forEachBody,
  options: forEachOptionsField,

  itemsUnresolved: markerField,
}) {}

export class BranchNode extends Schema.TaggedClass<BranchNode>("BranchNode")("Branch", {
  cond: symbolicCond,
  then: nodeSchema,
  else: nodeSchema,
}) {}

const verifyOptionsField = Schema.typeSchema(VerifyOptions);

export class VerifyNode extends Schema.TaggedClass<VerifyNode>("VerifyNode")("Verify", {
  items: symbolicItems,
  options: verifyOptionsField,

  itemsUnresolved: markerField,
}) {}

const isWorkflowDefShape = (u: unknown): u is AnyWorkflowDef => {
  const notObject = typeof u !== "object";
  const isNull = u === null;
  const notObjectLike = notObject || isNull;
  const hasTag = notObjectLike ? false : "_tag" in (u as Record<string, unknown>);
  const tagValue = hasTag ? (u as Record<string, unknown>)._tag : null;
  return tagValue === "WorkflowDef";
};

// AnyWorkflowDef extends Data.Class with function fields — Schema.declare with a runtime shape check is the only viable option.
const workflowDefField = Schema.declare(isWorkflowDefShape);

export class UseNode extends Schema.TaggedClass<UseNode>("UseNode")("Use", {
  workflow: workflowDefField,

  input: Schema.Unknown,
}) {}

export interface DynamicCtx {
  readonly runId: string;

  readonly nodeId: string;
}

const dynamicBuilder = functionField<(ctx: DynamicCtx) => Node>();

export class DynamicNode extends Schema.TaggedClass<DynamicNode>("DynamicNode")("Dynamic", {
  name: Schema.String,
  build: dynamicBuilder,
}) {}

export class WorkflowDef<P, A, E = never> extends Data.Class<{
  readonly name: string;
  readonly payload: Schema.Schema<P, any>;
  readonly success: Schema.Schema<A, any>;
  readonly error: Option.Option<Schema.Schema<E, any>>;
  readonly body: (payload: P) => Node;
}> {
  readonly _tag = "WorkflowDef";
}

export class AnyWorkflowDef extends Data.Class<{
  readonly name: string;
  readonly payload: unknown;
  readonly success: unknown;
  readonly error: Option.Option<unknown>;
  readonly body: (payload: any) => Node;
}> {
  readonly _tag = "WorkflowDef";
}

export const eraseWorkflow = <P, A, E>(def: WorkflowDef<P, A, E>): AnyWorkflowDef =>
  def as unknown as AnyWorkflowDef;
