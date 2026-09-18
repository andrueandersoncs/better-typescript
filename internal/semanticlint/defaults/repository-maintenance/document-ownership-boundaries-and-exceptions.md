---
globs:
  - "**/*"
---
# Document ownership boundaries and exceptions

Keep a short architecture document at the repository root that states dependency direction, runtime boundaries, and the commands used to build, test, and run the repository. Every nontrivial package must document its purpose, public API, consumers, and runtime requirements. Record consequential architectural decisions in short ADRs. Every exception to these boundaries must name its reason, owner, and condition for revisiting it.
