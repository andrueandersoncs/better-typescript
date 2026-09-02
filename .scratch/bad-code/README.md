# Bad code catalog

Disliked TypeScript shapes mined from maintainer-fed snippets. Not the built-in rule catalog.

Status counts: confirmed 1, prospective 7, rejected 0.

## Patterns

| Pattern | Status | Snippets | Rule candidate |
| --- | --- | --- | --- |
| [type-specific-equivalence-strict](patterns/type-specific-equivalence-strict.md) | confirmed | 002, 005 | `no-type-specific-equivalence-strict` |
| [abstract-class-with-readonly-properties](patterns/abstract-class-with-readonly-properties.md) | prospective | 006 | none |
| [bloated-sql-placeholder-list](patterns/bloated-sql-placeholder-list.md) | prospective | 007 | none |
| [boilerplate-existence-checks](patterns/boilerplate-existence-checks.md) | prospective | 003 | none |
| [hardcoded-literal](patterns/hardcoded-literal.md) | prospective | 001 | none |
| [hardcoded-timestamp-string-literal](patterns/hardcoded-timestamp-string-literal.md) | prospective | 007 | none |
| [monolithic-runtime-schema](patterns/monolithic-runtime-schema.md) | prospective | 001 | none |
| [unknown-effect-service-error](patterns/unknown-effect-service-error.md) | prospective | 004 | none |

## Snippets

| ID | Title | Patterns |
| --- | --- | --- |
| [001](snippets/001-runtime-schema.md) | RuntimeOptionsSchema Monolith | [hardcoded-literal](patterns/hardcoded-literal.md), [monolithic-runtime-schema](patterns/monolithic-runtime-schema.md) |
| [002](snippets/002-trivial-equivalence-wrap.md) | Trivial equivalence wrapper | [type-specific-equivalence-strict](patterns/type-specific-equivalence-strict.md) |
| [003](snippets/003-boilerplate-existence-checks.md) | Boilerplate Existence Checks | [boilerplate-existence-checks](patterns/boilerplate-existence-checks.md) |
| [004](snippets/004-dispatch-queue-service.md) | DispatchQueue service contract | [unknown-effect-service-error](patterns/unknown-effect-service-error.md) |
| [005](snippets/005-explicit-equivalence-types.md) | Explicit type parameters on Equivalence.strictEqual | [type-specific-equivalence-strict](patterns/type-specific-equivalence-strict.md) |
| [006](snippets/006-abstract-class-config.md) | Abstract class with many readonly properties | [abstract-class-with-readonly-properties](patterns/abstract-class-with-readonly-properties.md) |
| [007](snippets/007-hardcoded-timestamps-in-db-migration.md) | Hardcoded timestamps and raw SQL in database migration | [hardcoded-timestamp-string-literal](patterns/hardcoded-timestamp-string-literal.md), [bloated-sql-placeholder-list](patterns/bloated-sql-placeholder-list.md) |

## Confirmed rule candidates

Ready for `plan-pattern-remediation` or `implement-lint-rule`:

- [`no-type-specific-equivalence-strict`](patterns/type-specific-equivalence-strict.md) — Avoid families of primitive-specific `Equivalence.strictEqual<T>()` bindings.
