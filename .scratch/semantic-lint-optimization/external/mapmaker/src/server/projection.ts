import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  parseMapMarkdown,
  type ParsedMap,
} from "../domain/parse-map.ts";
import { projectEffortGraph } from "../domain/project-effort-graph.ts";
import { loadSessionsFile } from "../domain/sessions-sidecar.ts";
import {
  parseTicketMarkdown,
  type TicketRecord,
} from "../domain/tickets.ts";
import type { SessionPool } from "../omp/session-pool.ts";
import type { StripSnapshot } from "../omp/strip-chrome.ts";
import {
  WIRE_SCHEMA_VERSION,
  type EffortGraphDto,
  type EffortSnapshot,
  type HealthDto,
  type LiveAskDto,
  type MapChromeDto,
  type ReclaimableSessionDto,
  type StripSnapshotDto,
} from "../shared/wire-schema.ts";
import type { EffortLock } from "./lock.ts";

export type ProjectionSources = {
  effortPath: string;
  pool: SessionPool;
  lock: EffortLock;
  /** Optional live Ask overlays keyed by bind key. */
  liveAsks?: readonly LiveAskDto[];
  /** In-flight graph overlay from LiveAskController. */
  sessionOverlays?: readonly import("../domain/project-effort-graph.ts").SessionAskOverlay[];
  /** Health warnings (corrupt sidecar, etc.). */
  warnings?: readonly string[];
  now?: () => Date;
};

export type ProjectionParts = {
  map: MapChromeDto;
  graph: EffortGraphDto;
  strip: StripSnapshotDto;
  reclaimable: ReclaimableSessionDto[];
  liveAsks: LiveAskDto[];
  health: HealthDto;
  generatedAt: string;
};

function mapChromeFromParsed(map: ParsedMap): MapChromeDto {
  return {
    title: map.title,
    destination: map.destination,
    notes: map.notes,
    decisions: map.decisions,
    fog: map.fogEntries.map((e) => ({ id: e.idSlug, text: e.text })),
    outOfScope: map.outOfScopeEntries.map((e) => ({
      id: e.idSlug,
      text: e.text,
    })),
  };
}

function stripToDto(strip: StripSnapshot): StripSnapshotDto {
  return {
    chartLive: strip.chartLive,
    pills: strip.pills.map((p) => {
      const pill: StripSnapshotDto["pills"][number] = {
        key: p.key,
        kind: p.kind,
        liveness: p.liveness,
      };
      if (p.title !== undefined) pill.title = p.title;
      if (p.lastError !== undefined) pill.lastError = p.lastError;
      return pill;
    }),
  };
}

/** Load map.md + issues/*.md raw map for the projector. */
export async function loadEffortMarkdown(effortPath: string): Promise<{
  mapMarkdown: string;
  tickets: Map<string, string>;
  ticketRecords: TicketRecord[];
}> {
  const mapPath = join(effortPath, "map.md");
  let mapMarkdown = "";
  try {
    mapMarkdown = await readFile(mapPath, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") throw err;
  }

  const tickets = new Map<string, string>();
  const ticketRecords: TicketRecord[] = [];
  const issuesDir = join(effortPath, "issues");
  let names: string[] = [];
  try {
    names = await readdir(issuesDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") throw err;
  }

  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const relPath = `issues/${name}`;
    const raw = await readFile(join(effortPath, relPath), "utf8");
    tickets.set(relPath, raw);
    const parsed = parseTicketMarkdown(relPath, raw);
    if (parsed) ticketRecords.push(parsed);
  }

  ticketRecords.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  return { mapMarkdown, tickets, ticketRecords };
}

/**
 * Reclaimable = sidecar entry present, not live in pool, and (for tickets)
 * Status is still claimed on disk. Chart reclaim when sidecar chart set and
 * chart not live.
 */
export async function computeReclaimable(
  effortPath: string,
  pool: SessionPool,
  ticketRecords: readonly TicketRecord[],
): Promise<{ reclaimable: ReclaimableSessionDto[]; warnings: string[] }> {
  const warnings: string[] = [];
  const loaded = await loadSessionsFile(effortPath);
  if (loaded.warning) {
    warnings.push(loaded.warning);
  }
  const byRel = new Map(ticketRecords.map((t) => [t.relPath, t]));
  const reclaimable: ReclaimableSessionDto[] = [];
  const file = loaded.file;

  for (const [key, entry] of Object.entries(file.tickets)) {
    if (pool.getLive(key)) continue;
    const ticket = byRel.get(key);
    // Status wins: only claimed tickets are reclaim targets.
    if (ticket && ticket.status !== "claimed") continue;
    if (!ticket) continue;
    const row: ReclaimableSessionDto = {
      key,
      kind: entry.kind,
      sessionPath: entry.sessionPath,
      updatedAt: entry.updatedAt,
    };
    if (entry.lastError !== undefined) row.lastError = entry.lastError;
    reclaimable.push(row);
  }

  if (file.chart && !pool.isChartLive()) {
    const row: ReclaimableSessionDto = {
      key: "chart",
      kind: file.chart.kind,
      sessionPath: file.chart.sessionPath,
      updatedAt: file.chart.updatedAt,
    };
    if (file.chart.lastError !== undefined) row.lastError = file.chart.lastError;
    reclaimable.push(row);
  }

  reclaimable.sort((a, b) => a.key.localeCompare(b.key));
  return { reclaimable, warnings };
}

export function buildHealth(
  lock: EffortLock,
  warnings: readonly string[] = [],
): HealthDto {
  return {
    ok: true,
    effortPath: lock.effortPath,
    pid: lock.pid,
    port: lock.port,
    url: lock.url,
    warnings: [...warnings],
  };
}

/** Pure-ish assemble: I/O already done by caller or via buildEffortSnapshot. */
export function assembleSnapshot(
  sources: ProjectionSources,
  parts: Omit<ProjectionParts, "health" | "generatedAt"> & {
    warnings?: readonly string[];
  },
): EffortSnapshot {
  const now = sources.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const warningSet = [
    ...(sources.warnings ?? []),
    ...(parts.warnings ?? []),
  ];
  return {
    schemaVersion: WIRE_SCHEMA_VERSION,
    effortPath: sources.effortPath,
    generatedAt,
    map: parts.map,
    graph: parts.graph,
    strip: parts.strip,
    reclaimable: parts.reclaimable,
    liveAsks: parts.liveAsks,
    health: buildHealth(sources.lock, warningSet),
  };
}

/** Full disk+pool snapshot for GET hydrate and WS snapshot push. */
export async function buildEffortSnapshot(
  sources: ProjectionSources,
): Promise<EffortSnapshot> {
  const { mapMarkdown, tickets, ticketRecords } = await loadEffortMarkdown(
    sources.effortPath,
  );
  const parsedMap = parseMapMarkdown(mapMarkdown);
  const graph = projectEffortGraph({
    mapMarkdown,
    tickets,
    ...(sources.sessionOverlays?.length
      ? { sessionOverlays: sources.sessionOverlays }
      : {}),
  });
  const { reclaimable, warnings } = await computeReclaimable(
    sources.effortPath,
    sources.pool,
    ticketRecords,
  );

  return assembleSnapshot(sources, {
    map: mapChromeFromParsed(parsedMap),
    graph,
    strip: stripToDto(sources.pool.stripSnapshot()),
    reclaimable,
    liveAsks: [...(sources.liveAsks ?? [])],
    warnings,
  });
}

export type { ParsedMap };
