---
name: animate-git-history
description: Turn a Git repository's commit history into an evidence-grounded animated picture book.
---

# Animate Git History

## Inputs

The target repository, revision or path scope, intended audience, output location, requested medium, and delivery constraints. Default to the current repository, history reachable from `HEAD`, and a self-contained HTML picture book when the request leaves these open.

## Method

1. Establish the evidence boundary before interpreting the project. Confirm the repository root, selected refs and paths, repository age, commit count, whether the clone is shallow, and whether mailmap identities apply. Do not fetch, switch refs, rewrite history, or contact remotes unless the user requested it.
2. Inspect the selected history with read-only Git commands. Capture commit OIDs, parents, author display names, author and committer timestamps, subjects, decorations, topology, and per-file churn. Choose and disclose the time basis used in the story. Use the graph view to understand branches and merges, then inspect patches for only the commits considered as story beats. Treat commit messages as claims and diffs as change evidence; neither proves human intent.
3. Build one normalized event model before rendering. Keep the chosen revision and path scope with the data. Record merges, tags, renames, binary changes, roots, gaps, bursts, and missing history explicitly. Do not count binary changes as zero or collapse renamed files into unrelated deletion and creation when Git identifies the rename.
4. Write the book's premise before drawing it. Make the repository or its evolving body of work the subject; do not turn contributors into characters without a reason grounded in the request. Organize the history into five to ten illustrated spreads with a cover, a clear opening state, evidence-backed transformations, and a closing state. Use one to three sentences per spread. A commit list is source material, not the narrative structure.
5. Art-direct one coherent illustrated world from the repository's name, purpose, vocabulary, files, topology, and actual changes. When the evidence does not suggest a direction, generate several materially different concepts with [elicit-llm-creativity](../../../elicit-llm-creativity/SKILL.md) for this bounded step, then choose the concept that explains the history most clearly. Avoid defaulting to dashboards, card grids, timeline rails, charts, pill badges, or a decorated `git log`.
6. Storyboard every spread around an illustration that shows a concrete transformation. Let the image occupy most of the viewport; keep the caption concise and attach small commit OIDs or tags as evidence notes. Evolve recurring places, objects, colors, or characters across spreads so the book has continuity. Vary scale and composition between quiet setup, dense change, and resolution instead of repeating one card template.
7. Choose the narrowest delivery format that meets the request. Read [rendering modes](references/rendering-modes.md) for the picture-book contract and format-specific decisions. Prefer self-contained HTML with original inline SVG, CSS, and JavaScript; use standalone SVG for a single illustrated sequence, image frames for a printable or editable book, and video only when the delivery context needs a playable file.
8. Make page turns or scene changes the primary interaction. Provide previous/next navigation, play/pause when autoplay exists, restart, direct page access, keyboard operation, and a composed reduced-motion state. Keep every spread readable without motion and provide a static or print sequence. Motion should animate the illustrated world, not merely slide interface panels.
9. Keep the artifact private by default. Omit author emails and remote URLs unless requested. Before publishing or embedding external media, fonts, avatars, or logos, verify that the user authorized publication and that licenses permit it.
10. Verify source and surface independently. Recompute displayed facts from Git. Open the actual artifact, exercise every page control, resize it, test reduced motion and print/static mode, inspect the cover, a dense middle spread, and the ending, and check for runtime errors. Reject the result if its primary impression is a dashboard, timeline, or report rather than an illustrated book. For frames or video, inspect representative frames and probe the delivered file's dimensions, duration, and codec.

## Output

A finished animated picture book, its location, the exact revision and path scope represented, and concise notes for aggregation, shallow history, omitted private data, or other evidence limitations.

## Done

The artifact reads first as a coherent illustrated book and only second as a Git visualization. Its transformations trace back to the selected history, every spread remains understandable without animation, it works in its delivery environment, and it makes no unsupported claims about why changes happened.
