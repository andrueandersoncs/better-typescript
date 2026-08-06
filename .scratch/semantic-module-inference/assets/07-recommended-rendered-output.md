# Physical Module mismatch Advice prototype

Representative current report-format output for a fixture where one Semantic Module spans two files
and `src/orders/parse.ts` contains members of two Semantic Modules.

```text
src/orders/parse.ts [file] — mixed Physical Module
  fix: This Physical Module contains members of 2 Semantic Modules. Separate the modules without splitting any membership listed below. No destination or move direction is inferred.

  Semantic Module anchored at src/orders/parse.ts:8:1
    - OrderInput — type alias — src/orders/parse.ts:8:1

  Semantic Module anchored at src/orders/parse.ts:14:1
    - parseOrder — function — src/orders/parse.ts:14:1
    - formatOrderError — function — src/orders/parse.ts:31:1
    - OrderParseError — class — src/orders/errors.ts:4:1

  evidence: code-entities-here: 3
  evidence: semantic-modules: 2

src/orders/parse.ts [file] — split Semantic Modules
  fix: 1 Semantic Module anchored in this Physical Module spans multiple Physical Modules. Place each listed Semantic Module in one Physical Module. The anchor is only a deterministic reporting location; it is not a move recommendation.

  Semantic Module anchored at src/orders/parse.ts:14:1
    - parseOrder — function — src/orders/parse.ts:14:1
    - formatOrderError — function — src/orders/parse.ts:31:1
    - OrderParseError — class — src/orders/errors.ts:4:1

  Current Physical Modules
    - src/orders/errors.ts
    - src/orders/parse.ts

  evidence: code-entities: 3
  evidence: physical-modules: 2
  evidence: split-semantic-modules: 1
```

The underlying `semantic-module-placement` Signal is silent. It carries one tagged Detection per
split Semantic Module and one per mixed Physical Module; the adviser deduplicates and renders the
complete membership once in each applicable Advice block.
