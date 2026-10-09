---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not require a secret call order

Report an API whose operation works only after another call in an order callers must discover, such as requiring `client.connect()` before `client.send()`. Do not report independent operations or a required sequence that is inherent and made explicit by the API.
