//go:build semanticeval

package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Live evals call TypeSafe unless every request is in SEMANTIC_EVAL_CACHE. Run one with:
//
//	SEMANTIC_EVAL_OUT=/tmp/val.json go test -tags semanticeval -run '^TestSemanticEvalCases$' -count=1 -timeout 0 ./internal/semanticlint
//
// Inputs: SEMANTIC_EVAL_SPLIT (train, val, test, or all; default val), SEMANTIC_EVAL_CASES (comma-separated
// ids; overrides the split), SEMANTIC_EVAL_VARIANT (JSON prompt overrides), SEMANTIC_EVAL_MODEL (default
// jev-1.13.0), SEMANTIC_EVAL_CACHE (replay directory), SEMANTIC_EVAL_PACKED=1 (ask every matching policy).

func TestSemanticEvalCases(t *testing.T) {
	output := requiredEvalEnv(t, "SEMANTIC_EVAL_OUT")
	run, cases := newLiveEvalRun(t)
	split := os.Getenv("SEMANTIC_EVAL_SPLIT")
	if split == "" {
		split = "val"
	}
	ids := map[string]bool{}
	for id := range strings.SplitSeq(os.Getenv("SEMANTIC_EVAL_CASES"), ",") {
		if id = strings.TrimSpace(id); id != "" {
			ids[id] = true
		}
	}
	if len(ids) > 0 {
		split = "cases"
	}
	var selected []evalCase
	for _, item := range cases {
		if item.Label != "ambiguous" && (ids[item.ID] || len(ids) == 0 && (split == "all" || item.Split == split)) {
			selected = append(selected, item)
		}
	}
	if len(selected) == 0 || len(ids) > 0 && len(selected) != len(ids) {
		t.Fatalf("selected %d cases for split %q and %d ids", len(selected), split, len(ids))
	}
	report, err := run.runCases(context.Background(), selected, split)
	if err != nil {
		t.Fatal(err)
	}
	writeEvalReport(t, output, report)
	score := "undefined"
	if value := report.Accuracy["score"]; value != nil {
		score = fmt.Sprintf("%.4f", *value)
	}
	t.Logf("%d cases, %d errors, score %s, %d production input tokens, %d billed input tokens", len(report.Cases), report.Errors, score, report.Efficiency.InputTokens, report.BilledInputTokens)
}

// SEMANTIC_EVAL_OUT=/tmp/workload.json go test -tags semanticeval -run '^TestSemanticEvalWorkload$' -count=1 -timeout 0 ./internal/semanticlint
func TestSemanticEvalWorkload(t *testing.T) {
	output := requiredEvalEnv(t, "SEMANTIC_EVAL_OUT")
	run, _ := newLiveEvalRun(t)
	content, err := os.ReadFile(filepath.Join(evalDirectory, "workload.txt"))
	if err != nil {
		t.Fatal(err)
	}
	report, err := run.runWorkload(context.Background(), filepath.Join("..", ".."), strings.Fields(string(content)))
	if err != nil {
		t.Fatal(err)
	}
	writeEvalReport(t, output, report)
	t.Logf("%d files, %d input tokens, %d billed input tokens, %d requests", len(report.Files), report.Efficiency.InputTokens, report.Efficiency.BilledInputTokens, report.Efficiency.Requests)
}

// Each side takes comma-separated reports of repeated runs; metrics are averaged over a side's runs.
// SEMANTIC_EVAL_BASELINE=a1.json,a2.json,a3.json SEMANTIC_EVAL_CANDIDATE=b1.json,b2.json,b3.json SEMANTIC_EVAL_OUT=diff.json go test -tags semanticeval -run '^TestSemanticEvalCompare$' -count=1 ./internal/semanticlint
func TestSemanticEvalCompare(t *testing.T) {
	read := func(name string) []evalCasesReport {
		var reports []evalCasesReport
		for path := range strings.SplitSeq(requiredEvalEnv(t, name), ",") {
			content, err := os.ReadFile(strings.TrimSpace(path))
			if err != nil {
				t.Fatal(err)
			}
			var report evalCasesReport
			if err := json.Unmarshal(content, &report); err != nil {
				t.Fatal(err)
			}
			reports = append(reports, report)
		}
		return reports
	}
	comparison, err := compareEvalReports(read("SEMANTIC_EVAL_BASELINE"), read("SEMANTIC_EVAL_CANDIDATE"))
	if err != nil {
		t.Fatal(err)
	}
	writeEvalReport(t, requiredEvalEnv(t, "SEMANTIC_EVAL_OUT"), comparison)
	t.Logf("verdict %s over %d cases, %d flips", comparison.Verdict, comparison.Cases, comparison.Flips)
}

// newLiveEvalRun loads the corpus and the optional variant. A variant the harness refuses fails the
// test with a message starting "variant rejected:", so optimizers can tell it from other failures.
func newLiveEvalRun(t *testing.T) (evalRun, []evalCase) {
	t.Helper()
	rules, err := loadRules(t.TempDir(), "")
	if err != nil {
		t.Fatal(err)
	}
	cases, err := loadEvalCorpus(evalDirectory, rules)
	if err != nil {
		t.Fatal(err)
	}
	options := Options{Threshold: defaultThreshold, Model: os.Getenv("SEMANTIC_EVAL_MODEL"), prompts: defaultPrompts}
	if options.Model == "" {
		options.Model = evalModel
	}
	if path := os.Getenv("SEMANTIC_EVAL_VARIANT"); path != "" {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		decoder := json.NewDecoder(bytes.NewReader(content))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&options.prompts); err != nil {
			t.Fatalf("variant rejected: decode: %v", err)
		}
		if err := checkVariant(evalDirectory, cases, rules, options.prompts); err != nil {
			t.Fatalf("variant rejected: %v", err)
		}
	}
	run := evalRun{directory: evalDirectory, rules: rules, options: options, packed: os.Getenv("SEMANTIC_EVAL_PACKED") == "1", cache: os.Getenv("SEMANTIC_EVAL_CACHE")}
	if os.Getenv("TYPESAFE_API_KEY") != "" {
		client, err := newTypeSafeClient()
		if err != nil {
			t.Fatal(err)
		}
		run.next = client
	} else if run.cache == "" {
		t.Fatal("TYPESAFE_API_KEY or SEMANTIC_EVAL_CACHE is required")
	}
	return run, cases
}

func requiredEvalEnv(t *testing.T, name string) string {
	t.Helper()
	value := os.Getenv(name)
	if value == "" {
		t.Fatalf("%s is required", name)
	}
	return value
}

func writeEvalReport(t *testing.T, path string, value any) {
	t.Helper()
	var output bytes.Buffer
	if err := writeJSON(&output, value, true); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, output.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}
}
