---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid temporaries that merely repeat an expression

Report a temporary variable that merely renames or repeats an already-obvious expression without clarifying it, such as `const userName = user.name;` used only as `send(userName)`. Do not report a temporary whose name clarifies a non-obvious calculation, representation, or domain role.
