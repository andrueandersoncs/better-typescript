import type { AnyWorkflowDef, WorkflowDef } from "@open-workflows/core";
import { Schema } from "effect";
import { graphOf } from "./graphOf.js";
import type { GraphNode } from "./types.js";

export class InferenceNeed extends Schema.Class<InferenceNeed>("InferenceNeed")({
  needs: Schema.Boolean,

  uncertain: Schema.Boolean,
}) {}

const isInferenceNode = (n: GraphNode): boolean => {
  const agent = n.kind === "Agent";
  const verify = n.kind === "Verify";
  return agent || verify;
};

const isDynamicNode = (n: GraphNode): boolean => n.kind === "Dynamic";

export const inferenceNeed = (def: WorkflowDef<any, any, any> | AnyWorkflowDef): InferenceNeed => {
  const { nodes } = graphOf(def);
  const needs = nodes.some(isInferenceNode);
  const uncertain = nodes.some(isDynamicNode);
  return new InferenceNeed({ needs, uncertain });
};

export const needsInference = (def: WorkflowDef<any, any, any> | AnyWorkflowDef): boolean =>
  inferenceNeed(def).needs;
