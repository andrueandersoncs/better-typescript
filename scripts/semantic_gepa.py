"""Optimize semantic lint prompts with GEPA against the semanticeval harness.

Run from the repository root with TYPESAFE_API_KEY set and Go on PATH:

    mise exec go@1.26 -- uv run --with gepa --with litellm scripts/semantic_gepa.py --reflection-lm openai/gpt-5 --out /tmp/gepa

Each evaluation runs TestSemanticEvalCases on a batch of case ids with a prompt variant.
Scores are per-case `score`; objectives are accuracy and efficiency (log2 of seed tokens ÷ tokens).
A variant the harness rejects (too long, malformed, or quoting the corpus) scores 0 with the reason
as feedback. Any other failure, such as a TypeSafe error, stops the run.
"""

import argparse
import glob
import json
import math
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVALS = os.path.join(ROOT, "internal", "semanticlint", "testdata", "evals")
POLICIES = os.path.join(ROOT, "internal", "semanticlint", "defaults")


def load_cases():
    cases = {}
    for path in sorted(glob.glob(os.path.join(EVALS, "cases", "**", "*.jsonl"), recursive=True)):
        with open(path) as file:
            for line in file:
                case = json.loads(line)
                if case["label"] != "ambiguous":
                    cases[case["id"]] = case
    return cases


REJECTION = "variant rejected:"


def run_cases(ids, variant, model="jev-1.13.0"):
    """Run the Go harness on case ids; return (report, rejection reason). Other failures raise."""
    with tempfile.TemporaryDirectory() as directory:
        env = dict(os.environ, GOWORK="off", SEMANTIC_EVAL_CASES=",".join(ids), SEMANTIC_EVAL_MODEL=model,
                   SEMANTIC_EVAL_OUT=os.path.join(directory, "report.json"))
        if variant:
            env["SEMANTIC_EVAL_VARIANT"] = os.path.join(directory, "variant.json")
            with open(env["SEMANTIC_EVAL_VARIANT"], "w") as file:
                json.dump(variant, file)
        result = subprocess.run(
            ["go", "test", "-tags", "semanticeval", "-run", "^TestSemanticEvalCases$", "-count=1", "-timeout", "0", "./internal/semanticlint"],
            cwd=ROOT, env=env, capture_output=True, text=True)
        output = result.stdout + result.stderr
        if result.returncode != 0:
            for line in output.splitlines():
                if REJECTION in line:
                    return None, line[line.index(REJECTION):].strip()
            raise RuntimeError("semantic eval harness failed:\n" + output[-4000:])
        with open(env["SEMANTIC_EVAL_OUT"]) as file:
            report = json.load(file)
    failed = [case for case in report["cases"] if case.get("error")]
    if failed:
        raise RuntimeError(f"{len(failed)} cases failed, first {failed[0]['id']}: {failed[0]['error']}")
    return report, None


def snippet(case):
    """Gold-region source for the reflection model; planted cases show their inserted part."""
    files = [case["file"]] if "file" in case else [part["file"] for part in case["plant"]["parts"]]
    texts = []
    for name in files:
        with open(os.path.join(EVALS, name)) as file:
            lines = file.read().splitlines()
        ranges = case.get("goldLines") if "file" in case else [[1, len(lines)]]
        for start, end in ranges or [[1, min(len(lines), 40)]]:
            texts.append("\n".join(lines[max(0, start - 4):min(len(lines), end + 3)]))
    return "\n...\n".join(texts)[:4000]


# Must match evalMaximumPromptGrowth in internal/semanticlint/eval_test.go.
PROMPT_GROWTH = 4
COST_STAGES = ("candidate", "evidence", "final")

# GEPA's default template asks for every niche fact from the examples, which invites memorizing them.
# GEPA discards rejected proposals without showing the reason, so the harness limits are stated here.
REFLECTION_REQUIREMENTS = """Write an improved instruction. Requirements; an instruction that breaks one is discarded unseen:
- At most {limit} bytes of plain ASCII.
- One instruction serves every policy: testing, security, performance, Effect, readability, and more.
  Give general guidance on {guidance}. No per-policy sections.
- Do not quote or paraphrase the examples: no identifiers, string literals, paths, policy titles, or
  details specific to these cases. They are a small sample and will not recur.
- Start with a sentence and end with the line `Rule:`, because the policy text is appended after it.
{cost}
Provide the new instruction within ``` blocks."""

REFLECTION_TEMPLATES = {
    "candidate": """I use the instruction below as the start of a yes/no question about code. The text of one policy
follows it directly, and a model answers with the probability of yes for one source segment (`file`)
of a larger file at `path`. Yes selects the segment as candidate evidence for a later, separate
violation verdict. A missed segment loses its violation for good; each needless selection costs review work.

Current instruction:
```
<curr_param>
```

Segments judged with the current instruction, with feedback:
```
<side_info>
```

""" + REFLECTION_REQUIREMENTS.replace("{guidance}", "what makes a segment evidence or necessary context"),
    "final": """I use the instruction below as the start of a yes/no question about code. The text of one policy
follows it directly, and a model answers with the probability of yes given the selected source spans of
one file (`file`, at `path`); the spans are the whole file or several excerpts. The answer is the
violation verdict: at least 0.70 reports a violation and fails the run, 0.55 to 0.70 asks for review,
and anything lower passes. A real violation scored at or below 0.55 is lost silently; a clean file
scored at or above 0.70 is a false alarm.

Current instruction:
```
<curr_param>
```

Files judged with the current instruction, with feedback:
```
<side_info>
```

""" + REFLECTION_REQUIREMENTS.replace("{guidance}", "deciding whether the shown code breaks the policy"),
}

COST_TEMPLATE = """- Cost: the instruction repeats in every question, and every selected segment triggers more review
  requests. Variants estimated above {limit}x the original cost are discarded. Each 100 bytes beyond
  {seed} bytes spends about {per100}% of the allowed increase; the rest pays for extra selections. Win
  recall by sharper discrimination, not by selecting more.
"""


def encoded_length(text):
    """Bytes a prompt adds to a request, as the Go harness encodes it."""
    return len(json.dumps(text, ensure_ascii=False).encode()) - 2


def stage_tokens(result, stage):
    return result["efficiency"]["byStage"].get(stage, {}).get("inputTokens", 0)


class CostGate:
    """Estimates a candidate prompt's cost on the efficiency workload relative to the seed.

    Candidate-stage cost follows prompt length: every question repeats it. Evidence and final cost
    follow selection breadth, measured as the batch's tokens against the seed's on the same cases,
    smoothed by one minibatch of seed-average tokens.
    """

    def __init__(self, workload_report, seed_report, seed, limit, minibatch):
        stages = workload_report["efficiency"]["byStage"]
        self.weights = {stage: stages[stage]["inputTokens"] for stage in COST_STAGES}
        candidate = stages["candidate"]
        self.tokens_per_prompt_byte = candidate["questions"] * candidate["inputTokens"] / candidate["requestBytes"]
        self.seed = seed
        self.seed_cases = {case["id"]: case for case in seed_report["cases"]}
        self.prior = {stage: minibatch * sum(stage_tokens(case, stage) for case in seed_report["cases"]) / len(seed_report["cases"])
                      for stage in ("evidence", "final")}
        self.limit = limit

    def estimate(self, variant, results=()):
        """Estimated workload cost ÷ seed workload cost; results add the measured selection breadth."""
        prompt = variant.get("candidate", self.seed.get("candidate", ""))
        cost = self.weights["candidate"] + (encoded_length(prompt) - encoded_length(self.seed.get("candidate", prompt))) * self.tokens_per_prompt_byte
        for stage in ("evidence", "final"):
            measured = sum(stage_tokens(result, stage) for result in results)
            seeded = sum(stage_tokens(self.seed_cases[result["id"]], stage) for result in results)
            cost += self.weights[stage] * (measured + self.prior[stage]) / (seeded + self.prior[stage])
        return cost / sum(self.weights.values())

    def reflection_note(self):
        allowed = (self.limit - 1) * sum(self.weights.values())
        per100 = round(100 * 100 * self.tokens_per_prompt_byte / allowed)
        return COST_TEMPLATE.format(limit=self.limit, seed=encoded_length(self.seed["candidate"]), per100=per100)


class SemanticLintAdapter:
    propose_new_texts = None  # use GEPA's default reflective proposer with REFLECTION_TEMPLATES

    def __init__(self, cases, seed_tokens, seed, gate=None):
        self.cases = cases
        self.seed_tokens = seed_tokens
        self.seed = seed
        self.gate = gate

    def variant(self, candidate):
        """GEPA strips proposals; restore the trailing newline a seed prompt ends with."""
        return {name: text + "\n" if self.seed[name].endswith("\n") and not text.endswith("\n") else text
                for name, text in candidate.items()}

    def gated(self, variant, results=()):
        """The rejection for a variant over the cost limit; the seed is never gated."""
        if self.gate is None or variant == self.seed:
            return None
        estimate = self.gate.estimate(variant, results)
        if estimate > self.gate.limit:
            return f"variant rejected: estimated workload cost {estimate:.2f}x the seed; the limit is {self.gate.limit}x"
        return None

    def evaluate(self, batch, candidate, capture_traces=False):
        from gepa.core.adapter import EvaluationBatch

        variant = self.variant(candidate)
        report, rejection = None, self.gated(variant)
        if rejection is None:
            report, rejection = run_cases(batch, variant)
        if report is not None:
            rejection = self.gated(variant, report["cases"])
            if rejection is not None:
                report = None
        results = {case["id"]: case for case in report["cases"]} if report else {}
        outputs, scores, objectives, trajectories = [], [], [], []
        for case_id in batch:
            result = results.get(case_id) or {"id": case_id, "rejection": rejection, "score": 0.0, "efficiency": {"inputTokens": 0}}
            score = result["score"]
            tokens = result["efficiency"]["inputTokens"]
            efficiency = math.log2(self.seed_tokens[case_id] / tokens) if tokens and self.seed_tokens.get(case_id) else 0.0
            outputs.append(result)
            scores.append(score)
            objectives.append({"accuracy": score, "efficiency": efficiency})
            trajectories.append(result)
        return EvaluationBatch(outputs=outputs, scores=scores, objective_scores=objectives,
                               trajectories=trajectories if capture_traces else None)

    def make_reflective_dataset(self, candidate, eval_batch, components_to_update):
        dataset = {}
        for component in components_to_update:
            records = []
            for result in eval_batch.trajectories:
                case = self.cases[result["id"]]
                with open(os.path.join(POLICIES, case["policy"] + ".md")) as file:
                    policy = file.read()
                records.append({
                    "Inputs": {"policy": policy, "path": case["path"], "label": case["label"], "gold region": snippet(case)},
                    "Generated Outputs": {"outcome": result.get("outcome"), "violation probability": result.get("probability"), "score": result.get("score")},
                    "Feedback": result.get("rejection") or (result.get("feedback") or {}).get(component, ""),
                })
            dataset[component] = records
        return dataset


def optimize(reflection_lm, components=("candidate",), max_metric_calls=1200, minibatch=6, run_dir=None,
             workload_report=None, max_cost_ratio=None, selection_size=None):
    """Run GEPA; return the result and its best candidate as a harness-ready variant.

    With a workload report (from TestSemanticEvalWorkload on the seed prompts) and a cost ratio,
    variants whose estimated workload cost exceeds the ratio score 0. Only the candidate prompt's
    length is modeled; selection breadth comes from measured evidence and final tokens. A selection
    size makes GEPA select on evenly spaced `val` cases, leaving more budget for proposals;
    acceptance still uses the whole `val` split.
    """
    import gepa

    cases = load_cases()
    train = [case_id for case_id, case in cases.items() if case["split"] == "train"]
    val = [case_id for case_id, case in cases.items() if case["split"] == "val"]
    seed_report, _ = run_cases(train + val, None)
    if selection_size is not None and selection_size < len(val):
        val = val[::math.ceil(len(val) / selection_size)]
    seed_tokens = {case["id"]: case["efficiency"]["inputTokens"] for case in seed_report["cases"]}
    seed = {component: seed_report["prompts"][component] for component in components}
    gate = None
    if workload_report is not None and max_cost_ratio is not None:
        gate = CostGate(workload_report, seed_report, seed, max_cost_ratio, minibatch)
    templates = {}
    for component, text in seed.items():
        cost = gate.reflection_note() if gate is not None and component == "candidate" else ""
        templates[component] = REFLECTION_TEMPLATES[component].replace("{limit}", str(PROMPT_GROWTH * len(text.encode()) - 1)).replace("{cost}", cost)
    adapter = SemanticLintAdapter(cases, seed_tokens, seed, gate)
    result = gepa.optimize(
        seed_candidate=seed, trainset=train, valset=val, adapter=adapter,
        reflection_lm=reflection_lm, max_metric_calls=max_metric_calls, frontier_type="hybrid",
        reflection_minibatch_size=minibatch, run_dir=run_dir, seed=0, reflection_prompt_template=templates)
    return result, adapter.variant(result.best_candidate)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reflection-lm", required=True, help="litellm model name for GEPA reflection")
    parser.add_argument("--components", default="candidate", help="comma-separated prompts.go JSON fields")
    parser.add_argument("--max-metric-calls", type=int, default=1200)
    parser.add_argument("--workload-report", help="TestSemanticEvalWorkload report for the seed prompts; enables the cost gate")
    parser.add_argument("--max-cost-ratio", type=float, default=1.3, help="largest estimated workload cost ÷ seed cost")
    parser.add_argument("--selection-size", type=int, help="evenly spaced val cases GEPA selects on (default: all)")
    parser.add_argument("--out", required=True, help="directory for the GEPA run and best variant")
    args = parser.parse_args()
    workload = None
    if args.workload_report:
        with open(args.workload_report) as file:
            workload = json.load(file)
    _, variant = optimize(args.reflection_lm, tuple(args.components.split(",")), args.max_metric_calls, run_dir=args.out,
                          workload_report=workload, max_cost_ratio=args.max_cost_ratio, selection_size=args.selection_size)
    with open(os.path.join(args.out, "best-variant.json"), "w") as file:
        json.dump(variant, file, indent=2)
    print(json.dumps(variant, indent=2))


if __name__ == "__main__":
    main()
