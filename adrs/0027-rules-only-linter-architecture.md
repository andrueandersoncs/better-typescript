# ADR-0027: Rules-only linter architecture

## Status

Accepted

## Date

2026-08-18

## Context

The matcher, policy, guidance, signal, advice, wiring, and architecture-analysis system made a local
lint finding pass through multiple product models. Human disposition of the inventory selected 126
stable rule identities and discarded every higher-level aggregate and architecture fleet.

## Decision

Better TypeScript is a conventional linter with three packages: core, rules, and CLI. Core discovers
TypeScript projects and owns the minimal `Rule`, `Violation`, and `lint` interface. Rules owns one
deterministic catalog of 126 independently runnable reported rules. CLI loads a project, invokes
that catalog, and renders the resulting flat violation array.

A rule owns its recognition and actionable violation text. There is no user-authored configuration,
architecture classification, fleet, aggregate derivation, silent mode, alternate execution path, or
compatibility surface for the former system. Exact duplicate violations are removed and all output
is deterministically ordered.

## Consequences

- One source occurrence produces one located violation directly.
- The public model has no reporting layer beyond a violation.
- The repository has only `@better-typescript/core`, `@better-typescript/rules`, and
  `@better-typescript/cli`.
- Historical architecture analysis remains documented only in earlier ADRs.

## Supersedes

This ADR explicitly supersedes ADR-0024. It also makes the architecture-fleet decisions in ADR-0014,
ADR-0017, ADR-0021, ADR-0025, and ADR-0026 obsolete. Those records remain as historical context.

## Amended by

ADR-0028 supersedes only this ADR's rejection of user-authored configuration. ADR-0030 replaces
direct Rule-owned Violation construction with core-owned materialization from local findings. The
rules-only architecture and rejection of the former higher-level product models remain accepted.
