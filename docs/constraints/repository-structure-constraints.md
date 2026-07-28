# TypeScript repository structure constraints

A repository's directory tree is an architectural interface. It tells a reader where a concept
belongs, which concepts may exist beside it, and where a safe change can start and end. Structure
is readable when paths carry stable, truthful meaning and the tree makes invalid placement
obvious.

These are principle-level constraints for TypeScript repositories. They apply to repository-owned,
non-generated paths. A directory name alone is not proof of intent: a machine may enforce a
structural rule only when it is explicitly configured or documented for the repository. Repeated
layout may support a suggested rule, but not a hard finding until the repository adopts it.

1. **Every directory with an architectural role MUST have a truthful, stable name.**

   A directory's **role** is the kind of things it contains and the constraints that apply to those
   things. For example, `src` contains implementation source, `tests` contains executable checks,
   and `packages` contains independently addressable packages. A reader should be able to predict a
   path's role from the nearest named boundary without inspecting unrelated siblings.

   A role name must not promise a property that its contents do not have. A directory named
   `generated` must contain generated output rather than hand-maintained source; a directory named
   `fixtures` must not contain production implementation; and a directory named `shared` must not
   become an unbounded home for unrelated code.

2. **A collection directory MUST contain members of one declared kind.**

   A **collection directory** is a directory whose role is to hold many peer instances of one
   concept. `apps`, `packages`, `checks`, `examples`, and `plugins` commonly have this role. Its
   immediate non-exempt children are its **members**.

   For a collection directory, every member MUST be a directory. A regular file at that level mixes
   collection metadata or implementation with members and makes the directory's contract unclear.
   If a collection needs a manifest, overview, or other file, the repository must explicitly allow
   that filename for that collection. Do not treat every plural directory as a collection: `assets`
   and `types` often legitimately contain files.

   ```text
   packages/
     core/                 # member package
     checks/               # member package
     cli/                  # member package
     package.json          # invalid unless explicitly declared collection metadata
   ```

   The same rule applies to nested collections:

   ```text
   apps/
     web/                  # application member
     worker/               # application member
   ```

3. **Each collection member MUST satisfy its collection's membership contract.**

   A **membership contract** specifies the structure that makes a child a member: required files,
   required directories, permitted optional paths, package identity rules, and prohibited paths.
   Members of `packages`, for example, may require a `package.json`, a declared workspace name, and
   a source entry point. Members of `apps` may instead require an application manifest and a
   runnable entry point.

   The contract must describe the member's kind rather than incidental implementation choices. It
   should require `package.json` when independent package identity is the invariant; it should not
   require a particular internal helper filename unless that filename is part of the supported
   architecture. A collection directory with heterogeneous children must be split into named
   collections or have each child role made explicit.

4. **Sibling names and layouts MUST make comparable members comparable.**

   Members of one collection should use one naming grammar and one relevant layout. For example,
   package directories may use lowercase kebab case, and each may expose `src`, `tests`, and
   `package.json` when those concepts apply. A reader can then move from `packages/core` to
   `packages/cli` without first discovering a new local taxonomy.

   Consistency does not require false uniformity. An application may need `public`, while a library
   package does not. The membership contract must express that difference by member kind or an
   explicit capability, rather than accepting arbitrary divergence under one role.

5. **Structural boundaries MUST make ownership and navigation apparent.**

   A path must have one nearest owning boundary: the repository root, a workspace/package root, an
   application root, or another explicitly declared module boundary. Ownership determines the
   applicable configuration, tests, build entry points, and structural rules. A source file must
   not sit between two candidate roots such that its owner is ambiguous.

   Directory nesting should reflect containment, not accidental implementation history. Put code
   under the concept that owns its invariants and change cadence; do not create catch-all locations
   such as `common`, `misc`, or `utils` for unrelated concepts. A broad directory is justified only
   when its children share a stated role and a reader can identify the selection rule for that role.

6. **The tree MUST separate authored, generated, vendored, and executable evidence.**

   Generated output, third-party code, build artifacts, fixtures, and caches have different
   ownership and modification rules from authored production code. Each must live behind a named
   boundary such as `dist`, `generated`, `vendor`, `fixtures`, or a tool-defined cache directory.
   Repository structure checks must exclude those boundaries unless the check explicitly concerns
   them.

   This separation prevents generated or vendored layout from creating false conventions for
   authored code and prevents readers from editing output that a tool will replace.

7. **Rules MUST be scoped, explicit, and deterministic.**

   A structural rule applies to the smallest repository-owned workspace or package containing the
   path under review, together with parent configuration that explicitly covers that path. A nested
   owner may refine a parent rule but must not silently contradict it.

   A machine evaluation must use only the resolved path tree and the applicable structural
   configuration. Given the same tree and configuration, it must produce the same findings. It must
   report the violating path, the governing collection or boundary, and the unmet contract fact.
   It must not infer that a directory is a collection solely from English plurality or identifier
   similarity.

   A minimal explicit configuration could state the collection semantics directly:

   ```ts
   const repositoryStructure = {
     collections: {
       apps: {
         members: "directories",
         required: ["package.json", "src"],
       },
       packages: {
         members: "directories",
         required: ["package.json", "src"],
       },
     },
   } as const
   ```

   A checker may inspect the tree to propose candidate configuration: several siblings with the
   same required paths are useful evidence. Proposal is not enforcement. A repository must adopt
   the rule before an exception becomes a violation.

8. **Exceptions MUST be local, named, and narrow.**

   An exception is justified only when a member or collection has a distinct, documented role that
   cannot be represented by the ordinary contract. Name the exception and explain the different
   invariant it preserves. Do not use an unrestricted allowlist, a generic `other` directory, or a
   blanket rule suppression to avoid modeling a real architectural distinction.

   For example, allowing `README.md` in `packages` is a narrow collection-level exception. Allowing
   arbitrary files makes the collection's member-only guarantee unenforceable. If one package is a
   documentation-only package, give it a membership kind with its own contract rather than silently
   exempting its whole tree.

9. **Structural constraints SHOULD preserve future change locality.**

   Adding a new application, package, check, or example should have an obvious destination and a
   known minimum shape. Moving a concept should require changing its owner and its consumers, not
   discovering undocumented placement rules spread throughout the tree. A good topology keeps the
   change surface aligned with the concept being changed.

10. **Structure MUST serve architecture rather than a taxonomy aesthetic.**

    A shallow, heterogeneous tree can be correct when the concepts are genuinely distinct and their
    boundaries are explicit. A deeply regular tree is not automatically better: every layer must
    express a real ownership, membership, lifecycle, build, or dependency boundary. Do not add
    directories merely to make names symmetric.

Together, these constraints make directory names executable architectural claims. A collection
name states what may be its child; a membership contract states what makes that child valid; and
explicit scope makes the resulting rule safe to enforce without guessing intent.
