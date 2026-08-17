# ADR-0026: Static catalogs do not own their entries

## Status

Accepted

## Date

2026-08-17

## Context

ADR-0025 prevents Exclusive Consumer Ownership from crossing proven Semantic Subject boundaries, but
subject evidence does not distinguish a consumer from a catalog. A static catalog can be the only
component that references each entry it enumerates. Treating those references as consumption bonds
every otherwise independent entry to the catalog and makes the catalog's file their required home.

Ignoring all declaration-time or value references would avoid that result but would also discard
real ownership expressed through aliases, initializers, and value composition. Names, paths, and
export status cannot define the exception because the Semantic Reference Graph is
placement-independent.

## Decision

A reference is static aggregation evidence only when it places a referenced value directly into a
literal collection that is the declaration's value, allowing transparent expression wrappers. An
aggregation component is catalog-only when every outgoing cross-component reference is static
aggregation evidence and those references reach at least two target components.

Exclusive Consumer Ownership excludes references from catalog-only aggregation components when it
counts consumers. The references remain in the Semantic Reference Graph for other named laws. A
single static reference still proves ownership, and any executable, construction, type, inheritance,
decorator, or other non-aggregation reference keeps all of the component's references eligible for
ownership.

This refines only the consumer-counting part of ADR-0025. Its Semantic Subject boundary and version
2 ownership evidence remain unchanged.

## Consequences

- Static matcher, policy, and rule catalogs do not acquire ownership of the entries they enumerate.
- Aliases and single-entry initializers retain existing ownership behavior.
- Mixed catalogs that also use an entry remain ordinary consumers; the exception cannot hide an
  executable ownership relation.
- Accepted bonds retain their canonical ordering, evidence keys, and replayable proofs because the
  exception removes non-owning candidates before evidence is constructed.
