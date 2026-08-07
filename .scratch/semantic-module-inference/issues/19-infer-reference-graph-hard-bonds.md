# 19 — Infer neutral Semantic Reference Graph Hard Bonds

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Construct the canonical Program-closed-world Semantic Reference Graph and emit
the settled neutral cycle and exclusive-consumer ownership Hard Bonds with typed replay evidence.

**Blocked by:** 14 — Prove deterministic Semantic Module membership.

**Status:** ready-for-agent

- [ ] Build independent production and test graphs over normalized Code Entities; every edge is a
      TypeChecker-resolved call, value, type, construction, inheritance, decorator, or initializer
      reference attributed to its owning Code Entity.
- [ ] Resolve aliases to declaration-owning symbols; exclude declaration-name and self references;
      coalesce duplicate witnesses in canonical order.
- [ ] Record references outside every Code Entity as unowned consumers. Export syntax, names, paths,
      current co-location, and consumers outside the Program never affect the graph.
- [ ] Compute canonical strongly connected components. `semantic-reference-cycle` emits
      deterministic pairwise candidates for every multi-entity SCC, including ownerless root cycles.
- [ ] Condense each stratum graph into an SCC DAG. `exclusive-consumer-ownership` emits the
      canonical resolved witness pair only when a target component has one distinct consumer
      component and no unowned consumer.
- [ ] Zero-consumer roots and shared fan-in emit no ownership bond; ordinary Hard-Bond closure makes
      exclusive ownership chains transitive.
- [ ] Each rule owns a tagged versioned evidence Schema. Evidence and evidence keys include every
      SCC, consumer-set, unowned-consumer, and witness premise needed to replay the decision.
- [ ] The neutral preset contains exactly both frozen rules; object-oriented and functional catalogs
      remain explicit frozen empty arrays; combined presets instantiate one placement Policy.
- [ ] Typed fixtures cover chains, zero-consumer roots, shared fan-in, unowned top-level references,
      all reference kinds, aliases, root and owned cycles, Program isolation, and stratum isolation.
- [ ] Exact snapshot/proof and metamorphic tests prove source-order, name, formatting, and
      relocation stability. Focused and full tests pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.
