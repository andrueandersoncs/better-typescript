---
globs:
  - "package.json"
  - ".github/**/*.{yml,yaml}"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/bunfig.toml"
---
# Do not weaken test policy silently

Do not narrow test discovery, remove required test or type-check jobs, lower enforced thresholds, broaden exclusions or suppressions, or hide failures behind retries without an explicit approved reason.

Judge the configuration delta against the established repository policy. A deliberate replacement that preserves or improves protection is allowed.