# ADR-0033: One directory per built-in Rule

## Status

Accepted

## Context

A built-in Rule owns its identity, recognition, target, and message, but the source layout grouped
many complete Rules in category files. Rule-specific scanners and helpers also remained mixed with
shared evidence. Understanding or moving one Rule therefore required tracing several unrelated
files.

## Decision

Every built-in Rule has one canonical home at `packages/rules/src/rules/<rule-name>/`. Its
`index.ts` exports the Rule, `test/index.test.ts` verifies it, `fixtures/` contains its test inputs,
and the directory contains every helper used only by that Rule.

Code used by multiple Rules stays outside Rule homes under `packages/rules/src/internal/`. Shared
modules expose reusable evidence or scanner infrastructure. They do not own Rule identities,
verdicts, targets, or messages. The static `builtinRules` catalog imports every canonical Rule entry
explicitly.

A structural test keeps the selected identities, Rule directories, directory exports, catalog
objects, and dependency ownership consistent. Directory placement is a repository packaging
contract, not a semantic claim about modules in analyzed user code. Files remain the TypeScript
module boundary described by ADR-0020.

This decision supersedes ADR-0032's allowance for family files containing several complete Rules.

## Consequences

- One Rule, its tests, its fixtures, and all of its exclusive implementation can be found in one
  directory.
- Shared code has evidence of reuse by multiple Rules.
- Moving or deleting a Rule has one clear ownership boundary.
- Adding a Rule requires a directory entry and an explicit catalog import.
