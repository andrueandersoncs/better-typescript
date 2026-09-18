---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Generate the domain the property claims

Property generators must cover the input domain claimed by the property, including relevant boundaries, invalid values, and unusual structures. A valid-domain generator does not establish behavior for malformed wire input.

Do not require irrelevant partitions. Report only a material gap between the stated property and generated cases.