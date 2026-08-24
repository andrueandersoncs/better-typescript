# Convert Better TypeScript to Go

## Original request

Convert this project fully into a Go project. I want to use the same approach https://github.com/oxc-project/tsgolint uses. See the @prototypes/tsgolint-no-error-type/ for an example of a rule converted into tsgolint.

## Finalized plan

1. **Replace the Bun workspace with the pinned tsgolint Go foundation.**
   - Add `go.mod`, `go.sum`, and `go.work` for Go 1.26.
   - Pin the tsgolint and typescript-go revisions used by `prototypes/tsgolint-no-error-type/`.
   - Bring in only the required typescript-go submodule, patches, shim modules, bundled libraries, cached VFS, compiler host, rule listener, linter traversal, and checker-worker code.
   - Add the required upstream license notices and one initialization command that prepares the pinned submodule and patches.

2. **Implement one internal analysis path.**
   - Make `cmd/better-typescript` treat the current directory as the project root and load `./tsconfig.json` directly into one typescript-go Program.
   - Lint that Program's root source files with the complete built-in catalog at `error` level.
   - Model each rule as a name and tsgolint-style listener map keyed by typescript-go AST kind. Give listeners direct access to the current source file, Program, checker, and node/range reporters.
   - Register all enabled listeners once per file, dispatch them during one AST traversal, and use tsgolint's checker-worker execution.
   - Convert reports to the existing NDJSON fields with current-directory-relative slash paths, one-based UTF-16 locations, exact deduplication, and deterministic ordering.

3. **Port the complete rule catalog to Go.**
   - Create one `internal/rules/<rule_name>/` Go package for each of the 129 current built-in names and register every package exactly once in sorted name order.
   - Translate each rule's normal recognition, type/symbol checks, cross-file facts, target, and actionable message to direct typescript-go AST and checker operations. Use the prototype's `no-error-type` implementation as the concrete pattern.
   - Port only helpers required by multiple rules. Keep rule-specific helpers in the owning rule package.
   - Give each rule the smallest `testdata/` project containing one ordinary detection and one ordinary clean case. Add one Go test that checks the expected rule, message, file, line, and column for that representative case.

4. **Implement the single CLI behavior.**
   - Run analysis with no options, print `Analyzing <absolute current directory>.` to stderr, emit one NDJSON violation per stdout line, and exit successfully after the completed analysis.
   - Add one subprocess test that runs the binary in one representative TypeScript project, confirms the stderr status line and zero exit status, parses stdout as NDJSON, and confirms the full catalog produced the expected representative violations.

5. **Remove the TypeScript project implementation.**
   - Delete `packages/`, generated `dist` output, `package.json`, `bun.lock`, TypeScript configs, Prettier configuration, the TypeScript root config, TypeScript benchmark scripts, the programmatic example, and the integrated prototype.
   - Retain TypeScript only inside Go `testdata/` projects and the vendored Effect source used as rule reference material.
   - Add only Go build, format, vet, and test commands.

6. **Update repository documentation.**
   - Rewrite `README.md`, `CONTEXT.md`, `AGENTS.md`, `.gitignore`, architecture references, and both repository skills for the Go layout, initialization command, no-option current-directory CLI, direct typescript-go rule architecture, fixed 129-rule catalog, NDJSON output, and Go build/format/vet/test commands.
   - Remove documentation for TypeScript configuration, CLI flags, the JavaScript programmatic API, Bun/npm publishing, self-hosting, and benchmarking.

7. **Verify the happy path.**
   - Run the initialization command, Go formatting, `go vet ./...`, `go test ./...`, and `go build ./cmd/better-typescript`.
   - Run the built binary once from the representative valid TypeScript project and confirm the full catalog emits the expected NDJSON while the command exits successfully.

## Verification verdict

APPROVED
