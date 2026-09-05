# Executable-plan template pseudocode

## Review shell

- Load the plan, `currentCode`, `proposedCode`, current/proposed source snapshots, hydrated declaration ranges, files, derived `scopeGraph`, and current server-owned test evidence.
- Begin with the shallow isometric scope board, or the keyboard-accessible no-WebGL list, to distinguish declared edits, unchanged source context, and structural/dependency effects.
- Open the exact current/proposed Monaco source diff for a selected Schema, Interface, Type, or function signature; that diff is the source authority.
- Select a story and one `it.effect.prop` test, edit its full canonical file, and run only that test.
- Save a test and invalidate only that test; save a declaration and invalidate its dependent tests.
- Clear a decision when reviewed source changes. Block approval for unsaved edits, unresolved save failures, and current failed or not-run properties.
- Export the explicit decision, exact source snapshots, `currentCode`, `proposedCode`, `scopeGraph`, and server-owned evidence as the version `2.0.0` artifact.

## Scope derivation

- Pair current and proposed declarations by stable ID. Existing work has a current local source tree; entirely new work may have an empty current inventory.
- Derive Schema relationships from SchemaAST and other relationships only from explicit dependency and Effect input, success, error, and service metadata.
- Do not infer type-compatible connections, scan the repository for declarations, or portray a runtime call graph.
- Import only trusted declarative modules: their top-level initialization runs and lazy Schemas are forced.

## Local review server

- Accept loopback same-origin requests with the session token and resolve only allowlisted files inside the repository.
- Reject stale or out-of-range saves, write accepted source atomically, append its audit entry, and invalidate matching server-owned evidence.
- Run the selected canonical test through Vitest and persist byte-identical review artifact content.
