# Better TypeScript

TypeScript analysis for coding agents: Checks emit Detections, Wiring materializes Signals, and
derive emits Advice.

## Language

### Analysis kernel

**Check**: A function from the AST-node stream to a stream of Detections. AST-only; does not read
other Signals. _Avoid_: rule, detector, linter rule

**Detection**: One located finding from a Check — path, message, hint, optional data. _Avoid_:
finding, diagnostic, violation

**Signal**: The completed, named batch of Detections for one Check in one analysis run. _Avoid_:
result set, rule output

**Advice**: Aggregate interpretation of Signals for a file, directory, or project scope. _Avoid_:
meta-rule, report section

**Wiring**: The reviewed fleet: NamedChecks plus a derive function over their Signals. _Avoid_:
config soup, plugin set, registry

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
