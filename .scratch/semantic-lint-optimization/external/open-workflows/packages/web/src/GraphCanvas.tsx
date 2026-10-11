import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node as RFNode,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Array as EffectArray,
  HashMap,
  HashSet,
  Option,
  Predicate,
  Record as EffectRecord,
  Struct,
} from "effect";
import type { Graph, GraphEdge, GraphNode } from "@open-workflows/graph";
import { layoutGraph, type LaidOut, type PositionedNode } from "./layout.js";
import {
  isKept,
  type BranchArm,
  type FanOutProgress,
  type Maybe,
  type NodeStatus,
  type VerifyVerdict,
} from "./useRun.js";

const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "#cbd5e1",
  running: "#3b82f6",
  retrying: "#f59e0b",
  succeeded: "#22c55e",
  failed: "#ef4444",
  // a node deliberately stopped by request (DESIGN.md §9) — stone, distinct from red failure
  stopped: "#78716c",
};

const KIND_ACCENT: Record<string, string> = {
  Agent: "#8b5cf6",
  Step: "#0ea5e9",
  Verify: "#ec4899",
  Refuter: "#f472b6", // a verify refuter — a lighter shade of Verify's pink (it's a refuter agent)
  Dynamic: "#64748b",
  Subgraph: "#14b8a6",
  ForEach: "#6366f1",
  Parallel: "#6366f1",
  Branch: "#6366f1",
  Fail: "#ef4444", // a `fail()` leaf — red, the deliberate typed-failure point (DESIGN.md §5)
  Start: "#94a3b8",
  End: "#94a3b8",
};

const parentOf = (n: GraphNode): string[] => (n.parent ? [n.parent] : []);

const toggleHandler = (toggle: (id: string) => void, id: string) => (): string => {
  toggle(id);
  return id;
};

const defaultNodeStatus = (): NodeStatus => "idle";

type GraphCanvasProps = {
  readonly graph: Graph;
  readonly statuses: HashMap.HashMap<string, NodeStatus>;
} & Partial<{
  readonly progress: HashMap.HashMap<string, FanOutProgress>;

  readonly taken: HashMap.HashMap<string, BranchArm>;

  readonly verdicts: HashMap.HashMap<string, ReadonlyArray<VerifyVerdict>>;

  readonly spawned: HashMap.HashMap<string, number>;

  readonly collapsed: HashSet.HashSet<string>;

  readonly onToggleCollapse: (id: string) => void;
  readonly selectedId: string;
  readonly onSelect: (id: Maybe<string>) => void;
}>;

export const GraphCanvas = ({
  graph,
  statuses,
  progress,
  taken,
  verdicts,
  spawned,
  collapsed,
  onToggleCollapse,
  selectedId,
  onSelect,
}: GraphCanvasProps) => {
  const [positioned, setPositioned] = useState<ReadonlyArray<PositionedNode>>([]);

  const computeDimmed = (): HashSet.HashSet<string> => {
    const takenEntries = taken ? HashMap.entries(taken) : undefined;
    const arms = takenEntries
      ? EffectArray.fromIterable(takenEntries)
      : ([] as [string, BranchArm][]);
    const untakenIdsOf = ([branchId, arm]: readonly [string, BranchArm]): string[] => {
      const tookThen = arm === "then";
      const untakenArm = tookThen ? "else" : "then";
      const untakenPrefix = `${branchId}.${untakenArm}/`;
      const inUntakenArm = (n: GraphNode): boolean => n.id.startsWith(untakenPrefix);
      const armNodes = graph.nodes.filter(inUntakenArm);
      const idOf = Struct.get("id");
      return armNodes.map(idOf);
    };
    const ids = arms.flatMap(untakenIdsOf);
    return HashSet.fromIterable(ids);
  };
  const dimmed = useMemo(computeDimmed, [graph.nodes, taken]);

  const layoutEffect = (): (() => void) => {
    const alive = { current: true };
    // Returns whether it applied the layout so it isn't a bare void function; `.then` ignores it.
    const applyLayout = (l: LaidOut): boolean => {
      if (alive.current) setPositioned(l.nodes);
      return alive.current;
    };
    layoutGraph(graph).then(applyLayout);
    const cleanup = () => void (alive.current = false);
    return cleanup;
  };
  useEffect(layoutEffect, [graph]);

  const computeClusters = (): HashSet.HashSet<string> => {
    const parents = graph.nodes.flatMap(parentOf);
    return HashSet.fromIterable(parents);
  };
  const clusters = useMemo(computeClusters, [graph]);

  const computeNodes = (): RFNode[] => {
    const toRfNode = ({ node, x, y, width, height }: PositionedNode): RFNode => {
      const cluster = HashSet.has(clusters, node.id);
      const collapsible = node.kind === "Subgraph";
      const onToggle = collapsible ? onToggleCollapse : undefined;
      const handleToggle = onToggle ? toggleHandler(onToggle, node.id) : undefined;
      const progressOpt = progress ? HashMap.get(progress, node.id) : Option.none<FanOutProgress>();
      const liveProgress = Option.getOrUndefined(progressOpt);
      const verdictsOpt = verdicts ? HashMap.get(verdicts, node.id) : Option.none<ReadonlyArray<VerifyVerdict>>();
      const liveVerdicts = Option.getOrUndefined(verdictsOpt);
      const spawnedOpt = spawned ? HashMap.get(spawned, node.id) : Option.none<number>();
      const liveSpawned = Option.getOrUndefined(spawnedOpt);
      const collapsedHere = collapsed ? HashSet.has(collapsed, node.id) : false;

      // inline labelFor: builds the display label with progress, verdicts, and spawn info
      const hasStaticFanOut = Predicate.isNotUndefined(node.meta?.fanOut);
      const staticFanOut = hasStaticFanOut ? [`×${node.meta?.fanOut}`] : [];
      const fanOut = liveProgress ? [`${liveProgress.done}/${liveProgress.total}`] : staticFanOut;
      const unresolved = node.meta?.itemsUnresolved ? ["⚠ items unresolved"] : [];
      const concurrency = node.meta?.concurrency ? [`(${node.meta.concurrency})`] : [];
      const retryNote = node.meta?.retry ? [`↻${node.meta.retry}`] : [];
      const hasRefuters = Predicate.isNotUndefined(node.meta?.refuters);
      const refuters = hasRefuters ? [`refuters:${node.meta?.refuters}`] : [];
      const kept = liveVerdicts ? [`kept ${liveVerdicts.filter(isKept).length}/${liveVerdicts.length}`] : refuters;
      const hasSpawnCount = Predicate.isNotUndefined(liveSpawned);
      const spawnNote = hasSpawnCount ? `· spawned ${liveSpawned}` : "· opaque";
      const opaque = node.meta?.opaque ? [spawnNote] : [];
      const allParts = [[node.label], fanOut, unresolved, concurrency, retryNote, kept, opaque];
      const labelParts = EffectArray.flatten(allParts);
      const label = labelParts.join(" ");

      const statusOpt = HashMap.get(statuses, node.id);
      const nodeStatus = Option.getOrElse(statusOpt, defaultNodeStatus);
      const data: OwNodeData = {
        label,
        status: nodeStatus,
        accent: KIND_ACCENT[node.kind] ?? "#94a3b8",
        cluster,
        collapsible,
        collapsed: collapsible && collapsedHere,
        ...EffectRecord.filterMap({ onToggleCollapse: handleToggle }, Option.fromNullable),
        selected: node.id === selectedId,
        dimmed: HashSet.has(dimmed, node.id),
        width,
        height,
      };
      const rf: RFNode = {
        id: node.id,
        position: { x, y },
        type: "ow" as const,
        data,
        ...EffectRecord.filterMap(
          { parentId: node.parent, extent: node.parent ? ("parent" as const) : undefined },
          Option.fromNullable,
        ),
        draggable: false,
        selectable: true,
      };
      return rf;
    };
    return positioned.map(toRfNode);
  };
  const rfNodes: RFNode[] = useMemo(computeNodes, [
    positioned,
    clusters,
    statuses,
    progress,
    verdicts,
    spawned,
    collapsed,
    onToggleCollapse,
    selectedId,
    dimmed,
  ]);

  const computeEdges = (): Edge[] => {
    const toRfEdge = (e: GraphEdge): Edge => {
      const isBranchEdge = e.kind === "branch";
      const takenForBranch = isBranchEdge ? taken : undefined;
      const sourceOpt: Option.Option<BranchArm> = takenForBranch
        ? HashMap.get(takenForBranch, e.source)
        : Option.none();
      const arm = Option.getOrUndefined(sourceOpt);
      const armKnown = Predicate.isNotUndefined(arm);
      const labelDiffers = e.label !== arm;
      const labelMatches = e.label === arm;
      const isUntaken = armKnown && labelDiffers;
      const isTaken = armKnown && labelMatches;
      const notUntaken = !isUntaken;
      const sourceStatusOpt = HashMap.get(statuses, e.source);
      const sourceStatus = Option.getOrElse(sourceStatusOpt, defaultNodeStatus);
      const sourceRunning = sourceStatus === "running";
      const animated = notUntaken && sourceRunning;
      const edge: Edge = {
        id: e.id,
        source: e.source,
        target: e.target,
        ...EffectRecord.filterMap({ label: e.label }, Option.fromNullable),
        animated,
        style: {
          stroke: isTaken ? "#22c55e" : "#94a3b8",
          ...EffectRecord.filterMap({ strokeWidth: isTaken ? 2 : undefined }, Option.fromNullable),
          ...EffectRecord.filterMap(
            { strokeDasharray: isUntaken ? "4 4" : undefined, opacity: isUntaken ? 0.35 : undefined },
            Option.fromNullable,
          ),
        },
        ...EffectRecord.filterMap(
          { labelStyle: isUntaken ? { opacity: 0.4 } : undefined },
          Option.fromNullable,
        ),
      };
      return edge;
    };
    return graph.edges.map(toRfEdge);
  };
  const rfEdges: Edge[] = useMemo(computeEdges, [graph.edges, statuses, taken]);

  const handleNodeClick = (_e: React.MouseEvent, n: RFNode): string => {
    onSelect?.(n.id);
    return n.id;
  };
  const handlePaneClick = (): null => {
    onSelect?.(undefined);
    return null;
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        fitView
        proOptions={{ hideAttribution: true }}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

type OwNodeData = {
  readonly label: string;
  readonly status: NodeStatus;
  readonly accent: string;
  readonly cluster: boolean;

  readonly collapsible: boolean;

  readonly collapsed: boolean;
  readonly selected: boolean;

  readonly dimmed: boolean;
  readonly width: number;
  readonly height: number;
  readonly [key: string]: unknown;
} & Partial<{
  readonly onToggleCollapse: () => void;
}>;

const OwNode = ({ data }: NodeProps) => {
  const d = data as OwNodeData;
  const border = `2px solid ${STATUS_COLOR[d.status]}`;
  const running = d.status === "running";
  const runningGlow = running ? "0 0 0 4px rgba(59,130,246,0.2)" : undefined;
  const boxShadow = d.selected ? "0 0 0 3px rgba(15,23,42,0.55)" : runningGlow;

  if (d.cluster) {
    const showChevron = d.collapsible && d.onToggleCollapse;
    const handleChevronClick = (e: React.MouseEvent): boolean => {
      e.stopPropagation();
      d.onToggleCollapse!();
      return true;
    };
    return (
      <div
        style={{
          width: d.width,
          height: d.height,
          borderRadius: 8,
          border,
          borderLeft: `6px solid ${d.accent}`,
          background: d.collapsed ? "#fff" : "rgba(99,102,241,0.06)",
          boxShadow,
          opacity: d.dimmed ? 0.4 : 1,
          cursor: "pointer",
          fontFamily: "ui-sans-serif, system-ui",
        }}
      >
        <Handle type="target" position={Position.Top} style={HANDLE} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "#0f172a",
            whiteSpace: "nowrap",
          }}
        >
          {}
          {showChevron && (
            <button
              onClick={handleChevronClick}
              aria-label={d.collapsed ? "Expand subgraph" : "Collapse subgraph"}
              aria-expanded={!d.collapsed}
              title={d.collapsed ? "Expand subgraph" : "Collapse subgraph"}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                lineHeight: 1,
                color: "#475569",
                padding: 0,
                width: 14,
              }}
            >
              {d.collapsed ? "▸" : "▾"}
            </button>
          )}
          {d.label}
        </div>
        <Handle type="source" position={Position.Bottom} style={HANDLE} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        borderRadius: 8,
        border,
        borderLeft: `6px solid ${d.accent}`,
        background: "#fff",
        boxShadow,
        opacity: d.dimmed ? 0.4 : 1,
        cursor: "pointer",
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: 12,
        color: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 6,
        textAlign: "center",
      }}
    >
      <Handle type="target" position={Position.Top} style={HANDLE} />
      {d.label}
      <Handle type="source" position={Position.Bottom} style={HANDLE} />
    </div>
  );
};

// Handles carry the edges; keep them visually unobtrusive (the graph reads as boxes + arrows).
const HANDLE: React.CSSProperties = { opacity: 0, width: 1, height: 1, border: "none" };

const NODE_TYPES = { ow: OwNode };
