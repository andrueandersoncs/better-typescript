#!/usr/bin/env bash
# Usage: compare.sh <baseline> <candidate> [split-tag] — paired compare over SEEDS (default "1 2 3").
set -euo pipefail
D=~/.cache/better-typescript-evals/opt
tag=${3:-train+val}
side() { local out=""; for i in ${SEEDS:-1 2 3}; do out+="$D/$1-$tag-$i.json,"; done; echo "${out%,}"; }
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo/internal/semanticlint"
out=$D/compare-$1-vs-$2-$tag.json
SEMANTIC_EVAL_BASELINE=$(side "$1") SEMANTIC_EVAL_CANDIDATE=$(side "$2") SEMANTIC_EVAL_OUT=$out \
  "$D/bin-cur.test" -test.run '^TestSemanticEvalCompare$' -test.count=1 >/dev/null
jq -r '"verdict \(.verdict)  flips \(.flips)  excluded \(.excluded)",
  (.metrics[] | [.name, (.baseline // 0 | .*10000 | round / 10000), (.candidate // 0 | .*10000 | round / 10000),
   "[\(.low // 0 | .*1000 | round / 1000), \(.high // 0 | .*1000 | round / 1000)]", .verdict] | @tsv)' "$out" | column -t
