# Normalize Code Entity identity

Type: grilling Status: resolved

## Question

What exact normalization and stable identity rules turn TypeScript top-level declarations into Code
Entities, including variable bindings, destructuring, overload sets, declaration merging, default or
anonymous declarations, namespaces, and ambient declarations?

## Answer

A Code Entity is the smallest independently movable, symbol-bearing family of top-level
declarations.

- Normalize top-level functions, classes, interfaces, type aliases, enums, outermost
  namespaces/modules, and each `VariableDeclaration`, including ambient forms. Imports and exports
  are edges, not entities.
- One `VariableDeclaration` is one entity. Recursively collect every bound leaf identifier in source
  order; all of their checker symbols map to that entity. Property keys, omitted elements, and
  initializer references are evidence rather than owned symbols.
- All top-level `FunctionDeclaration`s sharing one checker symbol in one `SourceFile` form one
  overload entity, including signatures and the optional implementation. Same-symbol declarations
  in another file are separate merge contributions.
- Other legal declaration-merge contributions remain separate entities. A symbol lookup returns
  every contribution in canonical entity-key order; later bond policy decides their relationship.
- Each outermost namespace/module declaration is one entity, including dotted namespaces, ambient
  external modules, and global augmentations. Nested members are evidence owned by it. Repeated
  declarations remain separate merge contributions.
- Anonymous default class and function declarations are entities, displayed as `<default class>` or
  `<default function>`. Default-expression and export-assignment syntax is not.
- Import/export aliases never create or identify entities. Resolve them through the TypeChecker to
  declaration-owned symbols. Named default declarations own their local symbol; anonymous defaults
  own their compiler-provided default declaration symbol.
- Exclude a candidate with no coherent checker symbol, retain a typed normalization-exclusion
  reason, and continue inference. Never invent a synthetic semantic identity.
- Scope identity to one Program. Its serialized key is the normalized workspace-relative POSIX
  source path, the declaration-family anchor's `getStart()` and `getEnd()`, and its `SyntaxKind`.
  The first declaration in source order is the anchor. Sort keys lexicographically by those fields.
- Identity is deterministic and reproducible for an unchanged source snapshot. Edits and moves may
  change it; names are display metadata rather than identity.
- Preserve ambientness and augmentation kind as metadata for partition barriers, not as identity
  distinctions.
