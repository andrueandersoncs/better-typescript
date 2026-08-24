#!/usr/bin/env python3

import argparse
import json
import statistics
import subprocess
import time
from pathlib import Path


def payload(files: list[str], enabled: bool) -> bytes:
    rules = [{"name": "no-error-type"}] if enabled else []
    return json.dumps(
        {"version": 2, "configs": [{"file_paths": files, "rules": rules}]}
    ).encode()


def diagnostic_count(output: bytes) -> int:
    count = 0
    offset = 0
    while offset < len(output):
        length = int.from_bytes(output[offset : offset + 4], "little")
        kind = output[offset + 4]
        offset += 5 + length
        if kind == 1:
            count += 1
    if offset != len(output):
        raise RuntimeError("invalid tsgolint output framing")
    return count


def run(binary: Path, cwd: Path, request: bytes) -> tuple[int, int]:
    start = time.perf_counter_ns()
    completed = subprocess.run(
        [str(binary), "headless"],
        cwd=cwd,
        input=request,
        capture_output=True,
        check=True,
    )
    return time.perf_counter_ns() - start, diagnostic_count(completed.stdout)


def summary(values: list[int]) -> dict[str, float]:
    return {
        "minimumMs": min(values) / 1_000_000,
        "medianMs": statistics.median(values) / 1_000_000,
        "maximumMs": max(values) / 1_000_000,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("binary", type=Path)
    parser.add_argument("project", type=Path)
    parser.add_argument("--runs", type=int, default=50)
    parser.add_argument("--warmups", type=int, default=3)
    args = parser.parse_args()

    binary = args.binary.resolve()
    project = args.project.resolve()
    files = [str(path.resolve()) for path in sorted(project.rglob("*.ts"))]
    baseline_request = payload(files, False)
    rule_request = payload(files, True)

    for _ in range(args.warmups):
        run(binary, project, baseline_request)
        run(binary, project, rule_request)

    baseline: list[int] = []
    rule: list[int] = []
    diagnostics: set[int] = set()
    for index in range(args.runs):
        order = (False, True) if index % 2 == 0 else (True, False)
        for enabled in order:
            elapsed, count = run(
                binary,
                project,
                rule_request if enabled else baseline_request,
            )
            (rule if enabled else baseline).append(elapsed)
            if enabled:
                diagnostics.add(count)

    baseline_summary = summary(baseline)
    rule_summary = summary(rule)
    median_delta = rule_summary["medianMs"] - baseline_summary["medianMs"]
    median_percent = median_delta / baseline_summary["medianMs"] * 100
    result = {
        "files": len(files),
        "runs": args.runs,
        "warmups": args.warmups,
        "diagnosticCounts": sorted(diagnostics),
        "baseline": baseline_summary,
        "noErrorType": rule_summary,
        "medianDeltaMs": median_delta,
        "medianDeltaPercent": median_percent,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
