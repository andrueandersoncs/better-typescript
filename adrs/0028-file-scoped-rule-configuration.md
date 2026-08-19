# ADR-0028: File-scoped rule configuration

## Status

Accepted

## Date

2026-08-18

## Context

The rules-only overhaul deliberately removed configuration along with the former matcher, policy,
guidance, wiring, and architecture-analysis models. Projects still need to choose which filesystem
entities are linted and which registered rules apply to broad or specific entities. Restoring the
former abstractions would undermine the simplified linter, while passing one global rule array
cannot express those project-level choices.

## Decision

Better TypeScript optionally loads `better-typescript.config.ts` from the discovered project root.
The default or named `config` export is an ordered array of entries. Each entry contains workspace-
relative file globs and an `"error"`, `"warn"`, or `"off"` map of rule identifiers.

A configured file starts with every rule disabled. Matching entries apply in declaration order.
Later settings override earlier settings. The `"*"` selector changes every registered rule for that
entry, then explicit identifiers in the same entry override the wildcard. `"error"` and `"warn"`
enable a rule and set its reported violation level; `"off"` disables it. A file with no enabled rule
produces no violations. When no config file exists, the CLI enables every built-in rule for every
source file, preserving the rules-only overhaul's default behavior.

Every rule has one unique kebab-case identifier. Config keys other than `"*"` must use the same
format and must identify a rule supplied to `lint`. Invalid exports, malformed entries, invalid
identifiers, and unknown identifiers are operational errors.

Configuration remains part of core because glob selection is execution policy independent of the
built-in catalog. Core accepts the available rule registry and never depends on the rules package.
The CLI supplies `builtinRules`; programmatic callers may supply their own registered rules and an
optional config.

## Consequences

- Projects can lint broad globs and override individual files without restoring the former product
  models.
- Configuration controls only file selection and rule enablement levels. It does not add
  rule-specific options, suppression, plugins, or an aggregate reporting phase.
- Entry order is observable and must remain deterministic.
- Rule names are stable public identifiers rather than display labels.
- Self-hosting uses a root config that enables the entire built-in catalog across all package source
  files.

## Supersedes

This ADR supersedes ADR-0027 only where that decision rejected user-authored configuration. The
three-package rules-only architecture and its other consequences remain in force.
