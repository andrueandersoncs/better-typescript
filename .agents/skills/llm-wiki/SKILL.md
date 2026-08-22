---
name: llm-wiki
description: Build and operate a persistent Markdown wiki that an LLM maintains from immutable source documents. Use when creating, ingesting into, querying, or linting an LLM-maintained wiki or knowledge base.
---

# LLM Wiki

Build a persistent, source-grounded wiki whose synthesis compounds over time. Read [the original idea](references/original-idea.md) when you need its rationale, examples, or optional suggestions.

## Set Up the Wiki

1. Ask the user for the wiki's purpose, domain, source location, desired outputs, and review style.
2. Establish three layers at locations that fit the project:
   - **Raw sources:** human-curated source files. Treat them as immutable. Read them, but never rewrite, rename, or delete them during wiki work.
   - **Wiki:** LLM-maintained Markdown pages containing the current organized synthesis.
   - **Schema or agent instructions:** a file such as `AGENTS.md` that records the domain-specific structure and operating rules.
3. Define the smallest useful schema with the user. Record page types, naming and linking rules, citation format, source identifiers, metadata only when useful, and the ingest, query, lint, index, and log conventions.
4. Create `index.md` and `log.md`. Add only the initial pages the domain needs.

Keep the schema adaptable. Evolve it when repeated work shows a better convention, and record the change in `log.md`.

## Preserve the Contracts

- The human curates sources, sets direction, asks questions, and chooses how much review to perform.
- The LLM writes and maintains the wiki. It handles summaries, synthesis, cross-links, consistency, indexing, and history.
- Cite raw sources with stable paths or identifiers close to the claims they support. Preserve source-specific disagreement and distinguish source facts from new analysis.
- `index.md` is the content map. List every wiki page with a link and short description, organized for the domain. Update it whenever pages are created, renamed, or materially changed. Read it first when navigating or answering a query.
- `log.md` is the chronological, append-only history. Append dated, consistently formatted entries for ingests, durable queries, lint passes, and schema changes. Read recent entries when prior work or change order matters.

## Ingest a Source

1. Read the new raw source and the schema or agent instructions. Do not change the source.
2. Read `index.md`, then inspect every existing page affected by the source.
3. Identify new facts, strengthened or weakened claims, contradictions, connections, and gaps.
4. Integrate the findings across all affected pages. Create a source summary or new domain page only when the schema calls for it.
5. Add or update citations that resolve to the raw source. Keep conflicting claims and their provenance explicit.
6. Update cross-links and `index.md`, then append an ingest entry to `log.md` describing the source and material wiki changes.
7. Report what changed and any question that needs human direction.

## Answer a Query

1. Read the schema, `index.md`, and relevant recent log entries.
2. Follow the index and page links to the relevant maintained synthesis. Consult raw sources when a claim needs confirmation or the wiki exposes a gap.
3. Answer from the evidence. Cite the supporting wiki pages and underlying raw sources, and state contradictions or missing knowledge directly.
4. When the answer creates useful durable analysis, file or integrate it in the wiki with source citations. Update links and `index.md`, and append a query entry to `log.md`. Leave one-off answers in the conversation.

## Lint the Wiki

1. Read the schema, `index.md`, recent `log.md`, and the wiki pages.
2. Check for:
   - contradictions that are hidden or inconsistently represented;
   - stale claims superseded by newer evidence;
   - missing pages, indexed files that do not exist, and orphaned pages;
   - weak, missing, or broken cross-links and source citations;
   - important concepts or knowledge gaps that need a page, question, or source.
3. Apply safe bookkeeping fixes and reconcile synthesis when the evidence is clear. Route judgment calls according to the user's review convention.
4. Update `index.md` for any page changes and append a lint entry to `log.md` with findings, fixes, and unresolved gaps.

## Add Tools Proportionally

Start with Markdown files, file search, links, `index.md`, and `log.md`. Add search engines or embeddings only when navigation no longer works at the wiki's scale. Add image handling only for image-bearing sources. Add presentation formats only when the user needs those outputs. Add metadata or plugins only when they support a real repeated query or workflow. Record adopted tools and conventions in the schema.
