---
name: llm-wiki
description: Build and operate a persistent, Git-backed Markdown wiki that an LLM maintains from immutable source documents. Use when creating, ingesting into, querying, linting, or compacting an LLM-maintained wiki or knowledge base.
---

# LLM Wiki

Build a persistent, source-grounded wiki whose synthesis compounds over time. Read [the original idea](references/original-idea.md) when you need its rationale, examples, or optional suggestions.

## Set Up the Wiki

1. Ask the user for the wiki's purpose, domain, source location, desired outputs, and review style.
2. Create or use a Git repository as the wiki root. Keep human-curated source files in `raw/` inside that root. Keep the LLM-maintained Markdown pages alongside `raw/` so sources, citations, and history travel together.
3. Create a schema or agent-instruction file such as `AGENTS.md`. Define the smallest useful domain structure: page types, naming rules, relative-link and citation conventions, and the ingest, query, lint, compact, and commit workflows.
4. Create `README.md` as the root index. Start with a flat directory and only the initial pages the domain needs.
5. Commit the initial wiki as one coherent change.

Keep the schema adaptable. Evolve it when repeated work shows a better convention, and explain the change in the commit message.

## Preserve the Contracts

- The human curates sources, sets direction, asks questions, and chooses how much review to perform.
- The LLM writes and maintains the wiki. It handles summaries, synthesis, cross-links, consistency, indexing, structure, and history.
- Treat files in `raw/` as immutable. Read and cite them, but never rewrite, rename, or delete them during wiki work.
- Cite raw sources with standard relative Markdown links close to the claims they support. Preserve source-specific disagreement and distinguish source facts from new analysis.
- Use standard relative Markdown links such as `[Page](page.md)`, not wikilinks. When moving or renaming a page, fix every inbound link in the same change.
- `README.md` is the landing page and content map. List every root page with a link and short description, organized for the domain. Read it first when navigating or answering a query. Update it whenever pages are created, renamed, moved, deleted, or materially changed.
- Git history is the chronological log. Do not create `log.md`. Finish each wiki-changing operation with one commit that contains the wiki changes and their history entry together. Use a conventional title and a body that explains what changed and why.

## Ingest a Source

1. Read the new file in `raw/` and the schema or agent instructions. Do not change the source.
2. Read `README.md`, then inspect every existing page affected by the source.
3. Identify new facts, strengthened or weakened claims, contradictions, connections, and gaps.
4. Integrate the findings across all affected pages. Create a source summary or new domain page only when the schema calls for it.
5. Add or update relative citations into `raw/`. Keep conflicting claims and their provenance explicit.
6. Update cross-links and every affected `README.md`.
7. Commit the complete ingest as one change. Record the source, the pages touched, and why the synthesis changed in the commit message.
8. Report what changed and any question that needs human direction.

## Answer a Query

1. Read the schema and `README.md`. Use Git history when recent work or change order matters.
2. Follow the index and page links to the relevant maintained synthesis. Consult files in `raw/` when a claim needs confirmation or the wiki exposes a gap.
3. Answer from the evidence. Cite the supporting wiki pages and underlying raw sources, and state contradictions or missing knowledge directly.
4. When the answer creates useful durable analysis, integrate it into the wiki with source citations, update links and every affected `README.md`, and commit it as one query-driven change. Leave one-off answers in the conversation.

## Lint the Wiki

1. Read the schema, `README.md`, the wiki pages, and relevant Git history.
2. Check for:
   - contradictions that are hidden or inconsistently represented;
   - stale claims superseded by newer evidence;
   - missing pages, indexed files that do not exist, and orphaned pages;
   - weak, missing, or broken cross-links and source citations;
   - important concepts or knowledge gaps that need a page, question, or source;
   - pages or directories that need compaction.
3. Apply safe bookkeeping fixes and reconcile synthesis when the evidence is clear. Route judgment calls according to the user's review convention.
4. Update every affected `README.md`. If files changed, commit the lint fixes as one change with the findings, fixes, and unresolved gaps in the commit message.

## Compact the Wiki

When pages accumulate stale claims, repeated material, or low-value detail:

1. Rewrite decayed pages, merge pages that cover one subject, and delete pages that no longer earn their place.
2. Keep the repository flat for the first several dozen pages. When a real topic cluster makes the root hard to scan, move it into a subdirectory with its own `README.md`; link that index from the root `README.md`.
3. Fix all affected citations, inbound links, and indexes in the same change.
4. Commit the complete compaction as one change. Use Git history to recover anything later.

Suggest compaction when you notice structural debt rather than waiting for the user to find it.

## Add Tools Proportionally

Start with Markdown files, file search, relative links, `README.md`, and Git. Add search engines or embeddings only when navigation no longer works at the wiki's scale. Add image handling only for image-bearing sources. Add presentation formats only when the user needs those outputs. Add metadata or plugins only when they support a real repeated query or workflow. Record adopted tools and conventions in the schema.
