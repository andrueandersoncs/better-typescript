# ADR-0032: Rule-owned built-in verdicts

## Status

Accepted.

## Context

The rules-only architecture selected independently runnable Rule identities, but two retained
implementations still interpreted many identities through umbrellas. Effect Quality used closed
kind, candidate, scanner, and prose protocols. Concept Rules shared one interpreter that computed
Rule-specific verdicts and suppressed later identities when an earlier concept verdict existed. The
catalog also merged two `process-environment` implementations by name.

These mechanisms made a Rule's observable result depend on hidden identities and modules. Running a
concept Rule alone could omit a finding because an inactive Rule's verdict had already claimed the
same declaration.

## Decision

Every built-in Rule module owns its identity, recognition predicate, target selection, and
actionable message. Coherent family files may contain several complete Rules when they share local
recognition mechanics, but catalogs enumerate complete Rule values rather than kinds interpreted by
a generic verdict protocol.

Shared semantic modules expose evidence used by multiple Rules, such as Effect API resolution or
concept declarations, shapes, references, owners, roles, reads, conversions, and parameter bags.
They do not compute final Rule verdicts, targets, messages, or cross-Rule suppression.

Rules do not arbitrate other Rule identities. If multiple enabled Rules recognize one source
location, each reports its own Violation. This intentionally exposes concept overlaps that the old
umbrella suppressed and makes standalone and catalog execution agree for each Rule.

`process-environment` has one canonical Rule that owns both recognition forms and one message. The
catalog performs no identity-specific merging.

## Consequences

- One Rule can be understood, invoked, tested, and changed without reading an umbrella interpreter.
- Shared indexes retain expensive semantic evidence without owning product verdicts.
- Enabling or disabling one Rule does not change another Rule's recognition.
- Concept output includes intentional overlapping findings from independent Rules.
- Exact public Violation snapshots protect identity, level, message, location, column, and order.
