import { Effect } from "effect";
import { isNil } from "ramda";

import type { GraphAssembled } from "../balanceGraph/sheet/merge.ts";
import type { GraphEdgeAssembled, GraphNodeWithCounts } from "../balanceGraph/types.ts";
import {
  CannotMaskFocalNodeError,
  FocalNodeNotFoundError,
  MaskedNodeNotFoundError,
  MaskedNodeNotTokenError,
} from "./errors.ts";

export const GRAPH_COMPLETION_STRUCTURAL_TOKEN_MASK_MODE = "structural_token";
export const GRAPH_COMPLETION_FOCAL_SUBGRAPH_RESET_MASK_MODE = "focal_subgraph_reset";
export const GRAPH_COMPLETION_MASK_MODE = GRAPH_COMPLETION_STRUCTURAL_TOKEN_MASK_MODE;
export const GRAPH_COMPLETION_LEAKAGE_POLICY = "none";

export type GraphCompletionMaskMode =
  | typeof GRAPH_COMPLETION_STRUCTURAL_TOKEN_MASK_MODE
  | typeof GRAPH_COMPLETION_FOCAL_SUBGRAPH_RESET_MASK_MODE;
export type GraphCompletionLeakagePolicy = typeof GRAPH_COMPLETION_LEAKAGE_POLICY;

export type StructuralMaskedTokenHiddenTruth = {
  readonly node: GraphNodeWithCounts;
  readonly edges: readonly GraphEdgeAssembled[];
};

export type StructuralMaskedTokenAudit = {
  readonly removedNodeCount: number;
  readonly removedEdgeCount: number;
  readonly sourceNodeCount: number;
  readonly sourceEdgeCount: number;
  readonly observedNodeCount: number;
  readonly observedEdgeCount: number;
};

export type GraphEvalMaskHiddenTruth = {
  readonly nodes: readonly GraphNodeWithCounts[];
  readonly edges: readonly GraphEdgeAssembled[];
};

export type GraphEvalMaskPlan = {
  readonly focalNodeId: string;
  readonly maskMode: GraphCompletionMaskMode;
  readonly leakagePolicy: GraphCompletionLeakagePolicy;
  readonly deleteNodeIds: readonly string[];
  readonly expectedDeletedEdgeIds: readonly string[];
  readonly observedGraphPreview: GraphAssembled;
  readonly hiddenTruth: GraphEvalMaskHiddenTruth;
  readonly audit: StructuralMaskedTokenAudit;
};

export type StructuralMaskedTokenCase = {
  readonly focalNodeId: string;
  readonly maskedNodeId: string;
  readonly maskMode: GraphCompletionMaskMode;
  readonly leakagePolicy: GraphCompletionLeakagePolicy;
  readonly observedGraph: GraphAssembled;
  readonly hiddenTruth: StructuralMaskedTokenHiddenTruth;
  readonly audit: StructuralMaskedTokenAudit;
};

export type CreateStructuralMaskedTokenCaseInput = {
  readonly graph: GraphAssembled;
  readonly focalNodeId: string;
  readonly maskedNodeId: string;
};

export type CreateFocalSubgraphResetMaskPlanInput = {
  readonly graph: GraphAssembled;
  readonly focalNodeId: string;
};

const findNodeById = ({
  graph,
  nodeId,
}: {
  readonly graph: GraphAssembled;
  readonly nodeId: string;
}): GraphNodeWithCounts | undefined => graph.nodes.find((node) => node.nodeId === nodeId);

const isIncidentToNode = ({ edge, nodeId }: { readonly edge: GraphEdgeAssembled; readonly nodeId: string }): boolean =>
  edge.fromNodeId === nodeId || edge.toNodeId === nodeId;

const isDependentPairVisible = ({
  hiddenEdgeIds,
  maskedNodeId,
  pair,
}: {
  readonly hiddenEdgeIds: ReadonlySet<string>;
  readonly maskedNodeId: string;
  readonly pair: NonNullable<GraphAssembled["dependentPairs"]>[number];
}): boolean =>
  pair.originNodeId !== maskedNodeId &&
  pair.nodeId !== maskedNodeId &&
  pair.viaManagerId !== maskedNodeId &&
  !hiddenEdgeIds.has(pair.edgeId) &&
  !hiddenEdgeIds.has(pair.originEdgeId);

const isDependentPairVisibleForDeletedNodes = ({
  deletedEdgeIds,
  deletedNodeIds,
  pair,
}: {
  readonly deletedEdgeIds: ReadonlySet<string>;
  readonly deletedNodeIds: ReadonlySet<string>;
  readonly pair: NonNullable<GraphAssembled["dependentPairs"]>[number];
}): boolean =>
  !deletedNodeIds.has(pair.originNodeId) &&
  !deletedNodeIds.has(pair.nodeId) &&
  !deletedNodeIds.has(pair.viaManagerId) &&
  !deletedEdgeIds.has(pair.edgeId) &&
  !deletedEdgeIds.has(pair.originEdgeId);

const buildObservedGraphPreview = ({
  deletedEdgeIds,
  deletedNodeIds,
  graph,
}: {
  readonly deletedEdgeIds: ReadonlySet<string>;
  readonly deletedNodeIds: ReadonlySet<string>;
  readonly graph: GraphAssembled;
}): GraphAssembled => ({
  centerNodeId: graph.centerNodeId,
  nodes: graph.nodes.filter((node) => !deletedNodeIds.has(node.nodeId)),
  edges: graph.edges.filter((edge) => !deletedEdgeIds.has(edge.edgeId)),
  dependentPairs: graph.dependentPairs?.filter((pair) =>
    isDependentPairVisibleForDeletedNodes({ deletedEdgeIds, deletedNodeIds, pair })
  ),
});

const buildAudit = ({
  graph,
  observedGraph,
  removedNodeCount,
  removedEdgeCount,
}: {
  readonly graph: GraphAssembled;
  readonly observedGraph: GraphAssembled;
  readonly removedNodeCount: number;
  readonly removedEdgeCount: number;
}): StructuralMaskedTokenAudit => ({
  removedNodeCount,
  removedEdgeCount,
  sourceNodeCount: graph.nodes.length,
  sourceEdgeCount: graph.edges.length,
  observedNodeCount: observedGraph.nodes.length,
  observedEdgeCount: observedGraph.edges.length,
});

export const createStructuralMaskedTokenCase = Effect.fn("GraphCompletion.createStructuralMaskedTokenCase")(function* ({
  graph,
  focalNodeId,
  maskedNodeId,
}: CreateStructuralMaskedTokenCaseInput) {
  if (focalNodeId === maskedNodeId) {
    return yield* CannotMaskFocalNodeError.new({ focalNodeId });
  }

  const hiddenNode = findNodeById({ graph, nodeId: maskedNodeId });
  if (isNil(hiddenNode)) {
    return yield* MaskedNodeNotFoundError.new({ maskedNodeId });
  }
  if (hiddenNode.type !== "token") {
    return yield* MaskedNodeNotTokenError.new({ maskedNodeId, nodeType: hiddenNode.type });
  }

  const hiddenEdges = graph.edges.filter((edge) => isIncidentToNode({ edge, nodeId: maskedNodeId }));
  const hiddenEdgeIds = new Set(hiddenEdges.map((edge) => edge.edgeId));
  const dependentPairs = graph.dependentPairs?.filter((pair) =>
    isDependentPairVisible({ hiddenEdgeIds, maskedNodeId, pair })
  );
  const observedGraph: GraphAssembled = {
    centerNodeId: graph.centerNodeId,
    nodes: graph.nodes.filter((node) => node.nodeId !== maskedNodeId),
    edges: graph.edges.filter((edge) => !hiddenEdgeIds.has(edge.edgeId)),
    dependentPairs,
  };

  return {
    focalNodeId,
    maskedNodeId,
    maskMode: GRAPH_COMPLETION_MASK_MODE,
    leakagePolicy: GRAPH_COMPLETION_LEAKAGE_POLICY,
    observedGraph,
    hiddenTruth: {
      node: hiddenNode,
      edges: hiddenEdges,
    },
    audit: buildAudit({ graph, observedGraph, removedEdgeCount: hiddenEdges.length, removedNodeCount: 1 }),
  };
});

export const createFocalSubgraphResetMaskPlan = Effect.fn("GraphCompletion.createFocalSubgraphResetMaskPlan")(
  function* ({ graph, focalNodeId }: CreateFocalSubgraphResetMaskPlanInput) {
    const focalNode = findNodeById({ graph, nodeId: focalNodeId });
    if (isNil(focalNode)) {
      return yield* FocalNodeNotFoundError.new({ focalNodeId });
    }

    const hiddenNodes = graph.nodes.filter((node) => node.nodeId !== focalNodeId);
    const deletedNodeIds = new Set(hiddenNodes.map((node) => node.nodeId));
    const hiddenEdges = graph.edges;
    const deletedEdgeIds = new Set(hiddenEdges.map((edge) => edge.edgeId));
    const observedGraphPreview = buildObservedGraphPreview({ deletedEdgeIds, deletedNodeIds, graph });

    return {
      focalNodeId,
      maskMode: GRAPH_COMPLETION_FOCAL_SUBGRAPH_RESET_MASK_MODE,
      leakagePolicy: GRAPH_COMPLETION_LEAKAGE_POLICY,
      deleteNodeIds: hiddenNodes.map((node) => node.nodeId),
      expectedDeletedEdgeIds: hiddenEdges.map((edge) => edge.edgeId),
      observedGraphPreview,
      hiddenTruth: {
        nodes: hiddenNodes,
        edges: hiddenEdges,
      },
      audit: buildAudit({
        graph,
        observedGraph: observedGraphPreview,
        removedEdgeCount: hiddenEdges.length,
        removedNodeCount: hiddenNodes.length,
      }),
    };
  }
);
