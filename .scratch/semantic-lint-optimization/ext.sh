#!/usr/bin/env bash
# Usage: ext.sh <name> <a|b> — runs bin-<name>.test as a packed workload over external-<set>.txt,
# one process per seed in SEEDS (default "1 2 3"); seed i shares cache ext-cache-i across variants.
set -euo pipefail
name=$1 set=$2
D=~/.cache/better-typescript-evals/opt
O=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$O/../.." && pwd)
set -a; . "$repo/.env"; set +a
cd "$repo/internal/semanticlint"
for i in ${SEEDS:-1 2 3}; do
  mkdir -p "$D/ext-cache-$i"
  SEMANTIC_EVAL_WORKLOAD=$O/external-$set.txt SEMANTIC_EVAL_ROOT=$O/external SEMANTIC_EVAL_CACHE=$D/ext-cache-$i \
    SEMANTIC_EVAL_OUT=$D/ext-$set-$name-$i.json \
    "$D/bin-$name.test" -test.run '^TestSemanticEvalWorkload$' -test.count=1 -test.timeout 0 -test.v 2>&1 |
    grep -E 'files,|FAIL|panic' | sed "s/^/ext-$set $name $i: /" &
done
wait
