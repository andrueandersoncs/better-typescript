import { describe, expect, it } from "vitest";
import {
  edgesOfKind,
  indexGraphNodes,
  projectEffortGraph,
} from "./project-effort-graph.ts";
import type { GraphNode } from "./graph-model.ts";

const MAP_BASE = `# Fixture effort

Label: \`wayfinder:map\`

## Destination

Ship the projector.

## Notes

- Test notes.

## Decisions so far

- [Prior](issues/01-prior.md) — done.

## Not yet specified

- Need layout once projector lands
- _(empty placeholder should drop)_

## Out of scope

- Multiplayer editors
- Hosted SaaS

`;

function ticket(
  stem: string,
  body: string,
): readonly [string, string] {
  return [`issues/${stem}.md`, body] as const;
}

function idsOfKind(nodes: GraphNode[], kind: GraphNode["kind"]): string[] {
  return nodes.filter((n) => n.kind === kind).map((n) => n.id);
}

describe("projectEffortGraph", () => {
  it("projects map root, fog, oos, tickets, blocks, frontier", () => {
    const graph = projectEffortGraph({
      mapMarkdown: MAP_BASE,
      tickets: [
        ticket(
          "01-prior",
          `# Prior decision

Type: grilling
Status: resolved
Blocked by:

## Question

What came first?

## Answer

This did.
`,
        ),
        ticket(
          "02-blocked",
          `# Blocked ticket

Type: task
Status: open
Blocked by: 03

## Question

Waiting.
`,
        ),
        ticket(
          "03-frontier",
          `# Frontier ticket

Type: research
Status: open
Blocked by:

## Question

Take me.
`,
        ),
        ticket(
          "04-claimed",
          `# Claimed ticket

Type: grilling
Status: claimed
Blocked by:

## Question

In progress.
`,
        ),
      ],
    });

    const byId = indexGraphNodes(graph);
    expect(byId.get("map")?.kind).toBe("Map");

    const fog = graph.nodes.filter((n) => n.kind === "FogEntry");
    expect(fog).toHaveLength(1);
    expect(fog[0]?.text).toMatch(/layout/i);

    const oos = graph.nodes.filter((n) => n.kind === "OutOfScopeEntry");
    expect(oos.map((n) => n.text)).toEqual(
      expect.arrayContaining(["Multiplayer editors", "Hosted SaaS"]),
    );

    expect(idsOfKind(graph.nodes, "Ticket").sort()).toEqual([
      "01-prior",
      "02-blocked",
      "03-frontier",
      "04-claimed",
    ]);

    expect(byId.get("03-frontier")).toMatchObject({
      kind: "Ticket",
      frontier: true,
      status: "open",
    });
    expect(byId.get("02-blocked")).toMatchObject({
      kind: "Ticket",
      frontier: false,
    });
    expect(byId.get("04-claimed")).toMatchObject({
      kind: "Ticket",
      frontier: false,
      status: "claimed",
    });
    expect(byId.get("01-prior")).toMatchObject({
      kind: "Ticket",
      frontier: false,
      status: "resolved",
    });

    // contains: map → tickets/fog/oos
    const contains = edgesOfKind(graph, "contains");
    expect(contains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "map", target: "01-prior" }),
        expect.objectContaining({ source: "map", target: "03-frontier" }),
      ]),
    );
    expect(contains.some((e) => e.target.startsWith("fog:"))).toBe(true);
    expect(contains.some((e) => e.target.startsWith("oos:"))).toBe(true);

    // blocks: 03 → 02
    expect(edgesOfKind(graph, "blocks")).toEqual([
      expect.objectContaining({
        source: "03-frontier",
        target: "02-blocked",
      }),
    ]);

    // TicketQuestion 1:1
    expect(byId.get("ticketQuestion:03-frontier")).toMatchObject({
      kind: "TicketQuestion",
      body: "Take me.",
    });
    expect(
      edgesOfKind(graph, "hasTicketQuestion").map((e) => e.target).sort(),
    ).toEqual([
      "ticketQuestion:01-prior",
      "ticketQuestion:02-blocked",
      "ticketQuestion:03-frontier",
      "ticketQuestion:04-claimed",
    ]);

    // Resolution only on resolved
    expect(byId.get("resolution:01-prior")).toMatchObject({
      kind: "Resolution",
      body: "This did.",
    });
    expect(byId.has("resolution:03-frontier")).toBe(false);
    expect(edgesOfKind(graph, "hasResolution")).toEqual([
      expect.objectContaining({
        source: "01-prior",
        target: "resolution:01-prior",
      }),
    ]);
  });

  it("projects ticket ask spine and derives continues (incl. multi fan-from-each)", () => {
    const graph = projectEffortGraph({
      mapMarkdown: MAP_BASE,
      tickets: [
        ticket(
          "10-ask-spine",
          `# Ask spine

Type: grilling
Status: claimed
Blocked by:

## Question

Decide things.

## Asks

### AskTurn <!-- mapmaker:id=askturn:t1 -->

#### Question <!-- mapmaker:id=question:q1 -->

Pick colors?

- [x] Red <!-- mapmaker:id=answer:a1 source=agent selected -->
- [x] Blue <!-- mapmaker:id=answer:a2 source=agent selected -->
- [ ] Green <!-- mapmaker:id=answer:a3 source=agent -->

#### Question <!-- mapmaker:id=question:q2 -->

Next step?

- [x] Ship it <!-- mapmaker:id=answer:a4 source=agent selected -->
- [ ] Wait <!-- mapmaker:id=answer:a5 source=agent -->

### AskTurn <!-- mapmaker:id=askturn:t2 -->

#### Question <!-- mapmaker:id=question:q3 -->

Follow-up?

- [ ] Later <!-- mapmaker:id=answer:a6 source=agent -->
- [x] typed other <!-- mapmaker:id=answer:a7 source=custom selected -->
`,
        ),
      ],
    });

    const byId = indexGraphNodes(graph);
    expect(byId.get("askturn:t1")?.kind).toBe("AskTurn");
    expect(byId.get("question:q1")).toMatchObject({
      kind: "Question",
      multi: true,
      prompt: "Pick colors?",
    });
    expect(byId.get("answer:a1")).toMatchObject({
      kind: "GeneratedAnswer",
      selected: true,
      source: "agent",
      selectionOrder: 1,
    });
    expect(byId.get("answer:a2")).toMatchObject({
      selected: true,
      selectionOrder: 2,
    });
    expect(byId.get("answer:a3")).toMatchObject({ selected: false });
    expect(byId.get("answer:a7")).toMatchObject({
      source: "custom",
      selected: true,
      label: "typed other",
    });

    expect(edgesOfKind(graph, "hasAsk")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "10-ask-spine",
          target: "askturn:t1",
        }),
        expect.objectContaining({
          source: "10-ask-spine",
          target: "askturn:t2",
        }),
      ]),
    );

    const continues = edgesOfKind(graph, "continues");
    // Multi fan-from-each: a1 and a2 both continue to q2
    expect(continues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "answer:a1",
          target: "question:q2",
        }),
        expect.objectContaining({
          source: "answer:a2",
          target: "question:q2",
        }),
        // across ask turns: selected on q2 → first question of next turn
        expect.objectContaining({
          source: "answer:a4",
          target: "question:q3",
        }),
      ]),
    );
    // Unselected never continues
    expect(continues.some((e) => e.source === "answer:a3")).toBe(false);
    expect(continues.some((e) => e.source === "answer:a5")).toBe(false);
  });

  it("projects chart-thread asks under Map and impliesTicket from anchors only", () => {
    const mapWithChart = `${MAP_BASE}
## Asks

### AskTurn <!-- mapmaker:id=askturn:chart1 -->

#### Question <!-- mapmaker:id=question:cq1 -->

Form factor?

- [x] CLI + web <!-- mapmaker:id=answer:ca1 source=agent selected -->
- [ ] TUI only <!-- mapmaker:id=answer:ca2 source=agent -->

#### Question <!-- mapmaker:id=question:cq2 -->

Loop shape?

- [x] Full wayfinder <!-- mapmaker:id=answer:ca3 source=agent selected -->
`;

    const graph = projectEffortGraph({
      mapMarkdown: mapWithChart,
      tickets: [
        ticket(
          "01-form-factor",
          `# What form factor?

Type: grilling
Status: resolved
Blocked by:
<!-- mapmaker:impliesFrom=answer:ca1 -->

## Question

CLI?

## Answer

CLI + web.
`,
        ),
        ticket(
          "02-from-resolution",
          `# Downstream of resolution

Type: task
Status: open
Blocked by: 01
<!-- mapmaker:impliesFrom=resolution:01-form-factor -->

## Question

Build it.
`,
        ),
        ticket(
          "03-no-implies",
          `# No provenance

Type: research
Status: open
Blocked by:

## Question

Orphan ticket.
`,
        ),
      ],
    });

    // Chart spine under Map
    expect(edgesOfKind(graph, "hasAsk")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "map",
          target: "askturn:chart1",
        }),
      ]),
    );
    expect(edgesOfKind(graph, "continues")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "answer:ca1",
          target: "question:cq2",
        }),
      ]),
    );

    const implies = edgesOfKind(graph, "impliesTicket");
    expect(implies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "answer:ca1",
          target: "01-form-factor",
        }),
        expect.objectContaining({
          source: "resolution:01-form-factor",
          target: "02-from-resolution",
        }),
      ]),
    );
    expect(implies).toHaveLength(2);
    // No heuristic implies for 03
    expect(implies.some((e) => e.target === "03-no-implies")).toBe(false);
  });

  it("merges session overlay for in-flight ask and skips when disk already has turn", () => {
    const diskAsk = `# Live ticket

Type: grilling
Status: claimed
Blocked by:

## Question

Q

## Asks

### AskTurn <!-- mapmaker:id=askturn:persisted -->

#### Question <!-- mapmaker:id=question:pq1 -->

Done?

- [x] Yes <!-- mapmaker:id=answer:pa1 source=agent selected -->
`;

    const graph = projectEffortGraph({
      mapMarkdown: MAP_BASE,
      tickets: [ticket("05-live", diskAsk)],
      sessionOverlays: [
        {
          ownerId: "05-live",
          askTurnId: "askturn:inflight",
          questions: [
            {
              id: "question:iq1",
              prompt: "In flight?",
              multi: false,
              active: true,
              answers: [
                {
                  id: "answer:ia1",
                  label: "A",
                  source: "agent",
                  pending: true,
                },
                { id: "answer:ia2", label: "B", source: "agent" },
              ],
            },
          ],
        },
        // Duplicate of persisted turn — file wins, overlay skipped
        {
          ownerId: "05-live",
          askTurnId: "askturn:persisted",
          questions: [
            {
              id: "question:should-not-appear",
              prompt: "ghost",
              multi: false,
              answers: [
                { id: "answer:ghost", label: "nope", source: "agent" },
              ],
            },
          ],
        },
      ],
    });

    const byId = indexGraphNodes(graph);
    expect(byId.get("askturn:inflight")).toMatchObject({
      kind: "AskTurn",
      ephemeral: true,
    });
    expect(byId.get("question:iq1")).toMatchObject({
      kind: "Question",
      ephemeral: true,
      active: true,
    });
    expect(byId.get("answer:ia1")).toMatchObject({
      ephemeral: true,
      pending: true,
    });
    expect(byId.has("question:should-not-appear")).toBe(false);
    expect(byId.has("answer:ghost")).toBe(false);
    // Disk turn still present without ephemeral
    expect(byId.get("askturn:persisted")).toMatchObject({
      kind: "AskTurn",
    });
    expect(
      (byId.get("askturn:persisted") as { ephemeral?: boolean }).ephemeral,
    ).toBeUndefined();
  });

  it("does not invent continues without selected answers", () => {
    const graph = projectEffortGraph({
      mapMarkdown: MAP_BASE,
      tickets: [
        ticket(
          "11-unanswered",
          `# Unanswered

Type: grilling
Status: claimed
Blocked by:

## Question

Q

## Asks

### AskTurn <!-- mapmaker:id=askturn:u1 -->

#### Question <!-- mapmaker:id=question:uq1 -->

One?

- [ ] A <!-- mapmaker:id=answer:ua1 source=agent -->

#### Question <!-- mapmaker:id=question:uq2 -->

Two?

- [ ] B <!-- mapmaker:id=answer:ua2 source=agent -->
`,
        ),
      ],
    });
    expect(edgesOfKind(graph, "continues")).toEqual([]);
  });
});
