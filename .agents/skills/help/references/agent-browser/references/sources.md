# Source and adaptation

Source: [Vercel Labs agent-browser](https://github.com/vercel-labs/agent-browser), revision [`72007a6788d863611b23bed0b59d0d659c638d8e`](https://github.com/vercel-labs/agent-browser/tree/72007a6788d863611b23bed0b59d0d659c638d8e), inspected 2026-09-08. Its package version is 0.37.1.

Adapted material:

- [Skill discovery entry](https://github.com/vercel-labs/agent-browser/blob/72007a6788d863611b23bed0b59d0d659c638d8e/skills/agent-browser/SKILL.md)
- [Core workflow](https://github.com/vercel-labs/agent-browser/blob/72007a6788d863611b23bed0b59d0d659c638d8e/skill-data/core/SKILL.md)
- [Snapshot and ref guidance](https://github.com/vercel-labs/agent-browser/blob/72007a6788d863611b23bed0b59d0d659c638d8e/skill-data/core/references/snapshot-refs.md)
- [Session management](https://github.com/vercel-labs/agent-browser/blob/72007a6788d863611b23bed0b59d0d659c638d8e/skill-data/core/references/session-management.md)

The local skill condenses these sources into browser execution, a small command reference, and links from existing evidence workflows. It retains snapshot-based interaction, session ownership, state protection, and version-matched discovery. It replaces upstream's blanket tool preference with the user's selected interface and available purpose-built tools. QA and design research keep their existing owners. Optional cloud, desktop, and dashboard workflows remain in upstream's installed guides. No upstream performance claims or executable templates are bundled.

The installed CLI inspected during adaptation was 0.24.0 and did not support `skills`. The workflow therefore checks capabilities before loading runtime guides and preserves the basic command path for that version.

The upstream [Apache-2.0 license](../LICENSE) is included unchanged. The local skill and command reference are modified adaptations, not verbatim upstream copies.
