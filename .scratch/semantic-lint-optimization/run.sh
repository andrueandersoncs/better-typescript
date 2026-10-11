#!/usr/bin/env bash
# Usage: run.sh <name> [split] — runs bin-<name>.test packed over the split (default train,val),
# one process per seed in SEEDS (default "1 2 3"); seed i shares replay cache i with every variant.
# Extra environment (for example SEMANTIC_EVAL_VARIANT) passes through.
set -euo pipefail
name=$1
split=${2:-train,val}
D=~/.cache/better-typescript-evals/opt
repo=$(cd "$(dirname "$0")/../.." && pwd)
set -a; . "$repo/.env"; set +a
cd "$repo/internal/semanticlint"
tag=${split//,/+}
for i in ${SEEDS:-1 2 3}; do
  mkdir -p "$D/cache-$i"
  SEMANTIC_EVAL_PACKED=1 SEMANTIC_EVAL_SPLIT=$split SEMANTIC_EVAL_CACHE=$D/cache-$i \
    SEMANTIC_EVAL_OUT=$D/$name-$tag-$i.json \
    "$D/bin-$name.test" -test.run '^TestSemanticEvalCases$' -test.count=1 -test.timeout 0 -test.v 2>&1 |
    grep -E 'cases,|FAIL|panic' | sed "s/^/$name $i: /" &
done
wait
