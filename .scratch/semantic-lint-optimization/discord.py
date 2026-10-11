"""Compare two sides' workload reports over unlabeled files.

Usage: python3 discord.py <base-glob> <candidate-glob> <out.json>
Each side is several seeded runs. A (file, policy) pair is surfaced on a side when most runs
report `violation` or `review`. Pairs whose majority outcome differs are discordant and need labels.
"""

import glob
import json
import sys
from collections import defaultdict


def load(pattern):
    runs = [json.load(open(path)) for path in sorted(glob.glob(pattern))]
    votes = defaultdict(list)
    tokens = []
    for run in runs:
        tokens.append(run["efficiency"]["inputTokens"])
        for file in run["files"]:
            for finding in file.get("findings") or []:
                surfaced = finding["classification"] in ("violation", "review")
                votes[(file["path"], finding["rulePath"])].append(surfaced)
    return runs, votes, tokens


def main():
    base_runs, base, base_tokens = load(sys.argv[1])
    cand_runs, cand, cand_tokens = load(sys.argv[2])
    pairs = sorted(set(base) | set(cand))
    majority = lambda votes: sum(votes) * 2 > len(votes)
    discordant = []
    counts = defaultdict(int)
    for pair in pairs:
        left, right = majority(base.get(pair, [])), majority(cand.get(pair, []))
        counts[(left, right)] += 1
        if left != right:
            discordant.append({"file": pair[0], "rulePath": pair[1], "baseSurfaced": left, "candidateSurfaced": right})
    summary = {
        "runs": [len(base_runs), len(cand_runs)],
        "meanTokens": [sum(base_tokens) / len(base_tokens), sum(cand_tokens) / len(cand_tokens)],
        "pairs": len(pairs),
        "bothSurfaced": counts[(True, True)],
        "neither": counts[(False, False)],
        "baseOnly": counts[(True, False)],
        "candidateOnly": counts[(False, True)],
    }
    json.dump({"summary": summary, "discordant": discordant}, open(sys.argv[3], "w"), indent=2)
    print(json.dumps(summary, indent=2))


main()
