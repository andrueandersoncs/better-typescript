# Define the initial paradigm Hard Bond catalog

Type: grilling Status: resolved

## Question

Which placement-independent, TypeChecker-resolved relationships are semantically necessary enough to
be initial neutral, object-oriented, or functional Paradigm Hard Bond Rules, with deterministic
replayable evidence and no dependence on current Physical Module placement?

## Answer

The initial neutral catalog contains two placement-independent rules over one Program-scoped
Semantic Reference Graph. Object-oriented and functional catalogs remain explicitly empty.

The graph has one node per eligible Code Entity. A directed edge `A → B` exists when any declaration
owned by `A` contains a TypeChecker-resolved reference to a symbol owned by `B`. Calls, values,
types, construction, inheritance, decorators, and initializers all contribute typed edges. Aliases
resolve to declaration-owning symbols; declaration-name and self references do not contribute.
References outside every Code Entity are recorded as unowned consumers.

Build and analyze production and test graphs independently. Export syntax, paths, names, current
co-location, and consumers outside the Program do not affect the graph. The Program is the
closed-world ownership scope.

The neutral rules are:

1. `semantic-reference-cycle`: every strongly connected component with more than one Code Entity is
   atomic, including an ownerless root cycle. Emit canonical pairwise Hard Bonds between its sorted
   members.
2. `exclusive-consumer-ownership`: condense each stratum graph into its canonical SCC DAG. If a
   target component has exactly one distinct incoming consumer component and no unowned consumer,
   emit the canonical resolved witness pair joining consumer and target. Zero-consumer roots remain
   independent. Fan-in from multiple consumer components is shared dependency evidence and emits no
   ownership bond.

The existing deterministic Hard-Bond closure makes ownership chains transitive. A private chain such
as `parseOrder → normalizeOrder → trimOrderId` therefore becomes one Semantic Module. A helper used
by both `parseOrder` and `formatOrder` remains separate. TypeScript `export` does not change either
answer.

Each rule owns a tagged versioned evidence schema. Cycle evidence records the complete sorted SCC
and canonical internal reference witnesses. Ownership evidence records the source and target
components, the complete sorted incoming consumer set, absence of unowned consumers, and the
selected canonical reference witness. Evidence keys derive only from this portable semantic
evidence.

Proof fixtures must cover chains, root and owned cycles, shared fan-in, zero-consumer roots, unowned
top-level references, every reference kind, aliases, source permutation, relocation, Program
isolation, and production/test isolation. Semantic simplification, inlining, and reducing entity
count remain outside this placement-only effort.
