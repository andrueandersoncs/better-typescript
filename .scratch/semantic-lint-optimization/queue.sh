#!/usr/bin/env bash
# Runs variants one after another: queue.sh name[:variant.json] ...
set -uo pipefail
O=$(cd "$(dirname "$0")" && pwd)
for spec in "$@"; do
  name=${spec%%:*}
  if [[ $spec == *:* ]]; then
    SEMANTIC_EVAL_VARIANT=$O/${spec#*:} "$O/run.sh" "$name"
  else
    "$O/run.sh" "$name"
  fi
done
