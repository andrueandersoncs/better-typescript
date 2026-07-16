# Better TypeScript

TypeScript analysis for coding agents: Checks emit Detections, Wiring materializes Signals, and
derive emits Advice.

## Language

### Analysis kernel

**Check**: The local source-analysis behavior that emits Detections without reading other Signals.
_Avoid_: rule, detector, linter rule

**NamedCheck**: A Check bound to one stable name, reporting policy, and set of refactor examples.
Wiring selects NamedChecks rather than registering those facts separately. _Avoid_: rule
registration, check descriptor

**Detection**: One located finding from a Check — path, message, hint, optional data. _Avoid_:
finding, diagnostic, violation

**Signal**: The completed, named batch of Detections for one Check in one analysis run. _Avoid_:
result set, rule output

**Advice**: Aggregate interpretation of Signals for a file, directory, or project scope. _Avoid_:
meta-rule, report section

**Wiring**: The reviewed fleet: NamedChecks plus a derive function over their Signals. _Avoid_:
config soup, plugin set, registry

**Workspace Update**: One complete workspace-wide analysis snapshot. It is the input seam shared by
one-shot and continuous reporting. _Avoid_: watch callback, file-change event

**Report Event**: One emitted report transition — a signal block, a cleared block, or an explicit
empty report. _Avoid_: log line, diagnostic event

### Architecture Explore fleet

**Architecture Explore Wiring**: The standalone Wiring that turns improve-codebase-architecture
Explore smells into Checks and Advice. _Avoid_: architecture linter, skill runner

**Module**: For this fleet, one TypeScript source file. Advice may still title a directory when
clusters span files. _Avoid_: component, service, package (unless meaning npm package)

**Pass-through Wrapper**: An export that only re-exports or forwards a single call — interface
nearly as wide as implementation. _Avoid_: facade, proxy, barrel (unless it is specifically a
re-export barrel)

**Wide Thin Export Surface**: Many exports relative to a thin file body — a wide interface over
little depth. _Avoid_: god object, public API bloat

**Import Call Graph**: Silent evidence of import edges and call fan-in/fan-out used by Architecture
Explore Advice. _Avoid_: dependency graph service, metrics module

**Single-use Pure Export**: An exported pure-looking helper with one impure or orchestrating caller
— locality lost to a testability extract. _Avoid_: util, helper smell

**Seam Leakage Evidence**: Silent evidence that modules reach across a seam via deep imports or
shared mutable coupling. _Avoid_: coupling metric, boundary violation

**Hardwired Dependency**: Construction or module-scope I/O that blocks an injectable seam — hard to
test through the current interface. _Avoid_: anti-pattern, code smell

**Deletion-test Shallowness**: Advice that a Module fails the deletion test: removing it would
concentrate complexity across callers, not erase it. _Avoid_: low cohesion, bad abstraction

**Bounce Cluster**: Advice that understanding one concept requires crossing a cluster of thin
Modules. _Avoid_: spaghetti, module dust (as the Advice title)

**Leaked Seam**: Advice that tightly coupled Modules leak across their seam. _Avoid_: circular
dependency report

**Hard-to-test Hotspot**: Advice that Hardwired Dependencies concentrate so the Module cannot be
tested through its interface. _Avoid_: untestable code warning

**Import Usage**: Silent evidence of import specifiers and their call sites used to join
cross-package callers. _Avoid_: import graph service, usage index

**Module Identity**: Silent evidence mapping a Module to `package.json` exports and
`outDir`/`rootDir` aliases. _Avoid_: package resolver, path map

**Export Surface**: Silent evidence of a Module's public export map for interface and caller joins.
_Avoid_: public API inventory, barrel list

**Composition Forwarder**: An export that only forwards through curried or `pipe` composition —
shallow relative to its callers. _Avoid_: pipe helper, composition util

**Module-scope Effect**: Module-scope I/O or `Effect.run*` outside a composition root — hardwires
execution. _Avoid_: top-level await smell, global effect

**Context Tag Seam**: An Effect `Context.Tag` / Service seam, including dead seams with zero
consumers. _Avoid_: service locator finding, DI smell

**Composition Fingerprint**: Silent evidence of a multi-step composition shape used to detect
duplicated orchestration. _Avoid_: AST hash, clone detector

**Registration Ceremony**: Advice that a Module imports many symbols that are almost never
referenced. _Avoid_: unused import warning, import bloat

**Hub Module**: Advice that a Module concentrates many operations with high fan-in and fan-out.
_Avoid_: god module, central registry

**Invisible Tests**: Project-level Advice that no test file is visible across the workspace evidence
horizon. _Avoid_: missing coverage report, test discovery failure

**Duplicated Orchestration**: Advice that the same multi-step composition fingerprint appears in
multiple files. _Avoid_: copy-paste detector, clone report

**Paradigm Fleet**: The Architecture Explore opt-in split into core, OOP, and FP check sets with
three wirings and one shared derive. _Avoid_: architecture linter mode, paradigm plugin
