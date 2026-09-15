# Rendering modes

Choose the format from the delivery context. In every format, the primary experience is a sequence of illustrated spreads, not a dashboard with animation added.

## Picture-book contract

- Open with a cover that establishes the repository as a place, object, organism, or other coherent subject. Follow it with five to ten spreads and an ending or colophon.
- Give most of each spread to one original illustration. The image must show a repository state or transformation, not decorate a data card.
- Keep scene prose to one to three sentences. Put short OIDs, tags, dates, and scope notes in quiet evidence captions; move the complete transcript and methodology to the colophon or print view.
- Carry a small set of motifs through the whole book. Change their arrangement, scale, color, population, or condition as the repository changes.
- Compose each spread independently. Alternate wide scenes, close details, dense moments, and quiet pauses rather than swapping copy inside one repeated panel.
- Use original inline SVG or CSS illustration when external art is unnecessary. When raster art materially improves the chosen world, create or source it at delivery resolution, retain provenance, and embed it for a self-contained result.
- Animate the world itself: ink drawing in, shelves filling, paths joining, structures unfolding, pages turning. Sliding cards, counting badges, pulsing timeline dots, and generic particles do not satisfy the picture-book brief.
- Make the unanimated and print experiences intentional. A reader should be able to move through the whole book as static spreads with no missing state.

## Self-contained HTML

Default when the user wants an artifact they can open, explore, or share locally.

- Represent the cover and every spread as semantic sections with headings, story text, evidence captions, and an illustration description. JavaScript enhances these sections; it does not create the only readable copy.
- Inline required CSS, JavaScript, data, and assets. Avoid CDN dependencies and network requests unless the target repository already owns that delivery stack or the user requests them.
- Use one scene clock. Page navigation, autoplay, pausing, restarting, resizing, and direct page links must not desynchronize copy, evidence, and illustration state.
- Prefer SVG for authored scenes and crisp responsive geometry. Use Canvas only when measured complexity requires it, and retain equivalent semantic descriptions.
- Honor `prefers-reduced-motion` at initial load and when it changes. Reduced motion uses discrete page changes with each illustration already composed.
- Add print styles that reveal spreads in reading order without controls, clipped art, or blank animation states.

## Standalone SVG

Use for compact embeds or when one illustrated sequence can fit in a single vector artifact.

- Group the cover and spreads as named scenes. The base SVG must expose a complete static composition; CSS or SMIL may reveal or transform it.
- Include a title, description, view box, stable text layout, and sufficient contrast. Avoid relying on hover.
- Test the intended host because SVG animation, linked navigation, and font behavior differ across browsers, image viewers, and Markdown renderers.

## Image sequence

Use for a printable book, social carousel, deterministic frames, or downstream editing.

- Render one complete spread per numbered image, plus the cover and colophon. Do not export arbitrary animation frames in place of page compositions.
- Fix viewport, font inputs, color profile, and filenames before capture. Emit a manifest that maps each image to its scene and commit evidence.
- Inspect the cover, a dense middle spread, the ending, and any transition frames. Labels must remain stable and inside the crop.

## Video

Use only when a playable file is requested or the target cannot run an interactive artifact.

- Render from the same deterministic spreads used by HTML or the image sequence; do not author a second story.
- Let each spread settle long enough to read. Preserve page rhythm instead of moving continuously through a timeline.
- Keep text readable at the final encoded resolution. Add captions or a transcript when narration carries facts.
- Use locally available encoders and verify the delivered file's playback, dimensions, duration, and codec.
- Do not add music, voice, stock imagery, or licensed fonts without explicit need and usable rights.

## Translating Git evidence into pictures

- Branches and merges can become rivers joining, paths crossing, rooms connecting, grafted plants, or other structures whose geometry still corresponds to the selected topology.
- Churn and file movement can change the scale, density, weather, inventory, or construction of the illustrated world. Keep exact totals in the evidence caption rather than turning the spread into a chart.
- Releases and tags become chapter thresholds or named landmarks anchored to their commits.
- Important files, packages, or concepts may appear as labeled objects when the relevant diffs support them.
- Contributors appear only when collaboration is part of the requested story. Raw commit count is not a proxy for importance.
- Aggregated intervals receive a deliberate montage or passage-of-time spread, with the aggregation rule disclosed in the colophon.

Prefer one visual world and commit to it. For unusually immersive delivery, apply [build-immersive-web](../../build-immersive-web/SKILL.md) to the renderer while this skill retains ownership of history evidence, book structure, and narrative truth.
