# Bad code catalog

Disliked TypeScript shapes mined from maintainer-fed snippets. Not the built-in rule catalog.

Status counts: confirmed 0, prospective 5, rejected 3.

## Patterns

| Pattern | Status | Snippets | Rule candidate |
| --- | --- | --- | --- |
| [abstract-class-with-readonly-properties](patterns/abstract-class-with-readonly-properties.md) | prospective | 006 | none |
| [bloated-sql-placeholder-list](patterns/bloated-sql-placeholder-list.md) | prospective | 007 | none |
| [boilerplate-existence-checks](patterns/boilerplate-existence-checks.md) | prospective | 003 | none |
| [hardcoded-timestamp-string-literal](patterns/hardcoded-timestamp-string-literal.md) | prospective | 007 | none |
| [unknown-effect-service-error](patterns/unknown-effect-service-error.md) | prospective | 004 | none |
| [hardcoded-literal](patterns/hardcoded-literal.md) | rejected | none | none |
| [monolithic-runtime-schema](patterns/monolithic-runtime-schema.md) | rejected | 001 | none |
| [type-specific-equivalence-strict](patterns/type-specific-equivalence-strict.md) | rejected | none | none |

## Snippets

| ID | Title | Patterns |
| --- | --- | --- |
| [001](snippets/001-runtime-schema.md) | RuntimeOptionsSchema Monolith | [monolithic-runtime-schema](patterns/monolithic-runtime-schema.md) |
| [002](snippets/002-trivial-equivalence-wrap.md) | Trivial equivalence wrapper | none |
| [003](snippets/003-boilerplate-existence-checks.md) | Boilerplate Existence Checks | [boilerplate-existence-checks](patterns/boilerplate-existence-checks.md) |
| [004](snippets/004-dispatch-queue-service.md) | DispatchQueue service contract | [unknown-effect-service-error](patterns/unknown-effect-service-error.md) |
| [005](snippets/005-explicit-equivalence-types.md) | Explicit type parameters on Equivalence.strictEqual | none |
| [006](snippets/006-abstract-class-config.md) | Abstract class with many readonly properties | [abstract-class-with-readonly-properties](patterns/abstract-class-with-readonly-properties.md) |
| [007](snippets/007-hardcoded-timestamps-in-db-migration.md) | Hardcoded timestamps and raw SQL in database migration | [hardcoded-timestamp-string-literal](patterns/hardcoded-timestamp-string-literal.md), [bloated-sql-placeholder-list](patterns/bloated-sql-placeholder-list.md) |

