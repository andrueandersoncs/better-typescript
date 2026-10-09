---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use whitespace to separate logical steps

Report a wall of statements that performs distinct small tasks without blank lines between them, or blank lines that split one small task or create excessive spacing. For example, report `const orders = loadOrders(); const total = sum(orders); await sendInvoice(total)` when loading, calculating, and sending are separate steps. Keep statements for one small task together, then use one blank line before the next task. Do not report a compact group of statements that accomplishes one small task.
