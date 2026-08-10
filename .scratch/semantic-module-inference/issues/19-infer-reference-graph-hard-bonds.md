# 19 — Infer neutral Semantic Reference Graph Hard Bonds

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Construct the canonical Program-closed-world Semantic Reference Graph and emit
the settled neutral cycle and exclusive-consumer ownership Hard Bonds with typed replay evidence.

**Blocked by:** 14 — Prove deterministic Semantic Module membership.

**Status:** done

- [x] Build independent production and test graphs over normalized Code Entities; every edge is a
      TypeChecker-resolved call, value, type, construction, inheritance, decorator, or initializer
      reference attributed to its owning Code Entity.
- [x] Resolve aliases to declaration-owning symbols; exclude declaration-name and self references;
      coalesce duplicate witnesses in canonical order.
- [x] Record references outside every Code Entity as unowned consumers. Export syntax, names, paths,
      current co-location, and consumers outside the Program never affect the graph.
- [x] Compute canonical strongly connected components. `semantic-reference-cycle` emits
      deterministic pairwise candidates for every multi-entity SCC, including ownerless root cycles.
- [x] Condense each stratum graph into an SCC DAG. `exclusive-consumer-ownership` emits the
      canonical resolved witness pair only when a target component has one distinct consumer
      component and no unowned consumer.
- [x] Zero-consumer roots and shared fan-in emit no ownership bond; ordinary Hard-Bond closure makes
      exclusive ownership chains transitive.
- [x] Each rule owns a tagged versioned evidence Schema. Evidence and evidence keys include every
      SCC, consumer-set, unowned-consumer, and witness premise needed to replay the decision.
- [x] The neutral preset contains exactly the three frozen rules `semantic-reference-cycle`,
      `semantic-subject-ownership`, and `exclusive-consumer-ownership`; object-oriented and
      functional catalogs remain explicit frozen empty arrays; combined presets instantiate one
      placement Policy.
- [x] Typed fixtures cover chains, zero-consumer roots, shared fan-in, unowned top-level references,
      all reference kinds, aliases, root and owned cycles, Program isolation, and stratum isolation.
- [x] Exact snapshot/proof and metamorphic tests prove source-order, name, formatting, and
      relocation stability. Focused and full tests pass; formatting and self-hosting are clean; the
      benchmark remains below 100ms.

## Answer

The graph, both settled rules, and a third neutral rule ship. `semantic-subject-ownership` resolves
a Code Entity's semantic subject from TypeChecker facts: every parameter is the same first-party
data declaration and the result is a boolean verdict, or the entity is a value helper whose
initializer calls exactly one subject-owned operation. Resolution iterates to a fixpoint over
canonically ordered entities before bond closure, and its evidence records operation, subject,
derivation kind, and anchor.

`exclusive-consumer-ownership` evidence moved to version 2 with both resolved subject sets. A bond
is withheld when consumer and target components each carry subjects and share none, so private
implementation chains can no longer merge independently proven subjects.
