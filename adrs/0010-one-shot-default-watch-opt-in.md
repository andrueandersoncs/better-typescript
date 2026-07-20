# ADR-0010: One-shot default with opt-in watch

## Status

Superseded in part by [ADR-0023](0023-one-shot-effects-and-rerun-watch.md), which retains the
one-shot default and `--watch` but replaces incremental deltas with complete reruns.

## Date

2026-07-09

## Context

ADR-0007 made the CLI continuous-only: start the TypeScript watch pipeline, print the initial
report, and keep running. ADR-0008 later made stdout an NDJSON stream of `ReportEvent` values, with
`--pretty` as a rendering projection over the same events. ADR-0009 then recorded `ReportWiring` as
the user-fleet boundary while carrying forward ADR-0007's continuous-default consequence.

The implemented CLI now has two modes. Without `--watch`, it loads the configured `ReportWiring`,
loads the project snapshot, writes `Analyzing <root>.` to stderr, emits the initial report events to
stdout, and exits after stdout drains. With `--watch`, it loads the same wiring, discovers the watch
workspace, writes `Watching <root> for changes.` to stderr, emits the initial report, then stays
alive for changed and cleared deltas.

Script, CI, and coding-agent consumers need a terminating default. A command that requires an
external timeout blurs successful completion with forced termination, makes self-hosting checks
depend on shell-specific timeout tools, and leaves agents guessing when a captured report is
complete. A one-shot default gives these consumers a finite stdout contract and a normal exit code
while preserving the continuous pipeline for interactive work.

## Decision

The CLI is one-shot by default.

The default command analyzes the project once, emits the initial `ReportEvent` stream, and exits `0`
when the stream completes. The initial event projection is the same vocabulary used by watch mode:

- one `SignalEvent` (`_tag: "signal"`) per report block when the snapshot has signals;
- one `EmptyReportEvent` (`_tag: "empty"`) when the snapshot has no signals.

There is no `ClearedEvent` in a one-shot run because there is no previous report state. Startup
failures still use the existing tool-error path and exit `2`.

`--pretty` is only a projection over those same events. In default mode it renders the finite
initial events as human-readable text blocks and then exits. In watch mode it renders the initial
events and subsequent deltas the same way. Status lines remain stderr-only: `Analyzing <root>.` for
the one-shot default and `Watching <root> for changes.` for watch mode.

`--watch` is the explicit opt-in for the existing continuous TypeScript watch behavior. It retains
the initial report, keeps the process alive, and then emits deltas from `watchReportFromWiring`:
changed or new blocks emit `SignalEvent`s, blocks that disappear emit `ClearedEvent`s, and rebuilds
with no visible report change emit nothing. The config/wiring module is loaded once at startup;
changing the fleet still requires a restart.

The implementation reuses the snapshot report-block stages and the initial `ReportEvent` projection
instead of inventing a second snapshot wire format. The public runner seam remains
`reportFromWiring` for snapshot library use and `watchReportFromWiring` for continuous streams; the
CLI's default event output is the initial event projection of the snapshot report blocks.

This ADR supersedes ADR-0007's continuous-only/default CLI claim and ADR-0009's corresponding
consequence that the public product boundary is a continuous NDJSON report stream whose default
behavior watches the project. It retains ADR-0007's watch pipeline and change gates for `--watch`,
and it retains ADR-0008's NDJSON event vocabulary and `--pretty` projection for both modes.

## Alternatives Considered

### Keep continuous watch as the default

- Pros: preserves ADR-0007's original product shape and avoids a mode distinction.
- Cons: script, CI, and agent consumers must use external time bounds to make the command terminate,
  which makes successful analysis look like a killed process and makes captured stdout completeness
  ambiguous.
- Rejected. Continuous analysis remains available, but it must be requested with `--watch`.

### Default to text output for one-shot runs

- Pros: a finite human-readable report is familiar in terminals.
- Cons: ADR-0008 established coding agents as the primary stdout consumer and made NDJSON the
  parseable default. Switching only the one-shot default back to text would split the contract by
  mode and make `--pretty` mean different things.
- Rejected. NDJSON stays the default; `--pretty` is the opt-in text projection in both modes.

### Use a separate snapshot output format

- Pros: a one-shot command could expose a compact summary tailored to finite reports.
- Cons: consumers would need one parser for default snapshots and another parser for watch events,
  even though the initial report has the same semantics in both modes. A separate format would also
  bypass the already-tested report key and event identity model.
- Rejected. One-shot output uses the same initial `ReportEvent` projection as watch mode.

### Remove watch mode

- Pros: simplifies the CLI to one terminating mode.
- Cons: the existing TypeScript watch pipeline, changed/cleared delta semantics, and quiet-batch
  gates are still useful for interactive agent loops and editor-like workflows.
- Rejected. The watch pipeline remains part of the product behind explicit `--watch`.

## Consequences

- `better-typescript` and `npm start` are finite by default: they emit NDJSON initial events and
  exit after completion.
- `npm run dev` remains the pretty self-hosting command, but it no longer needs an external timeout
  for the default check; bounded watch checks pass `--watch` explicitly.
- One-shot consumers only need to handle `signal` and `empty` events for a single initial report.
  Consumers that opt into `--watch` must also handle `cleared` events and the absence of output for
  quiet rebuilds.
- ADR-0007 remains the rationale for the watch implementation, not for the default CLI mode.
- ADR-0008 remains the wire-format contract for both modes.
- ADR-0009 remains the `ReportWiring` and config contract, except where it described the default
  product boundary as continuous watching.
