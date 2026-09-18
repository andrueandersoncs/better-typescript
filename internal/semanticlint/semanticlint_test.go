package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
)

type recordingEvaluator struct {
	mu    sync.Mutex
	calls int
}

func (evaluator *recordingEvaluator) Evaluate(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
	evaluator.mu.Lock()
	evaluator.calls++
	evaluator.mu.Unlock()
	answers := make(map[string]answer, len(request.Questions))
	for id := range request.Questions {
		answers[id] = answer{Type: "noul", Noul: 0.9}
	}
	return evaluationResponse{Model: "test-model", Answers: answers, Usage: Usage{InputTokens: 10, OutputTokens: 2}}, nil
}

type selectingEvaluator struct {
	finalRequest []byte
}

func (evaluator *selectingEvaluator) Evaluate(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
	answers := make(map[string]answer, len(request.Questions))
	for id, question := range request.Questions {
		if question.Type == "choice" {
			selected := "none"
			for option := range question.Criteria {
				if option == "file_2" || (selected == "none" && option != "none") {
					selected = option
				}
			}
			probabilities := make(map[string]float64, len(question.Criteria))
			for option := range question.Criteria {
				probabilities[option] = 0.1 / float64(max(len(question.Criteria)-1, 1))
			}
			probabilities[selected] = 0.9
			answers[id] = answer{Type: "choice", Choice: selected, Confidence: 0.9, Probabilities: probabilities}
			continue
		}
		answers[id] = answer{Type: "noul", Noul: 0.95}
		if id == "rule_1" {
			evaluator.finalRequest, _ = json.Marshal(request)
		}
	}
	return evaluationResponse{Model: "test-model", Answers: answers, Usage: Usage{InputTokens: 1, OutputTokens: 1}}, nil
}

func TestRunDryRunPlansChangedFilesWithoutTypeSafe(t *testing.T) {
	_, fileName, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate testdata")
	}
	root := t.TempDir()
	if err := os.CopyFS(root, os.DirFS(filepath.Join(filepath.Dir(fileName), "testdata", "project"))); err != nil {
		t.Fatal(err)
	}
	runGit(t, root, "init", "--quiet")
	runGit(t, root, "add", ".")
	runGit(t, root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--quiet", "-m", "initial")
	file := filepath.Join(root, "src", "main.ts")
	if err := os.WriteFile(file, []byte("debugger;\nexport const value = 1;\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--dry-run"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	var documents []json.RawMessage
	if err := json.Unmarshal(output.Bytes(), &documents); err != nil {
		t.Fatalf("decode dry-run output: %v\n%s", err, output.String())
	}
	foundPlan := false
	foundRule := false
	for _, document := range documents {
		var value struct {
			Kind  string `json:"kind"`
			Rules []struct {
				Path string `json:"rulePath"`
			} `json:"rules"`
		}
		if json.Unmarshal(document, &value) != nil || value.Kind != "dry-run-plan" {
			continue
		}
		foundPlan = true
		for _, rule := range value.Rules {
			if strings.HasSuffix(rule.Path, "/no-debugger.md") {
				foundRule = true
			}
		}
	}
	if !foundPlan || !foundRule {
		t.Fatalf("dry-run plan missing plan or project rule: %s", output.String())
	}
}

func TestTypeSafeClientSendsTypedRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1/systemone" || request.Header.Get("Authorization") != "Bearer secret" {
			t.Errorf("unexpected request %s with authorization %q", request.URL.Path, request.Header.Get("Authorization"))
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Error(err)
			return
		}
		if !bytes.Contains(body, []byte(`"type":"noul"`)) {
			t.Errorf("request does not contain a Noul question: %s", body)
		}
		response.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(response, `{"model":"jev-1.13.0","answers":{"violation":{"type":"noul","noul":0.82}},"usage":{"input_tokens":12,"output_tokens":3}}`)
	}))
	defer server.Close()
	client := &typeSafeClient{apiKey: "secret", baseURL: server.URL, client: server.Client(), permits: make(chan struct{}, 1)}
	result, err := client.Evaluate(context.Background(), evaluationRequest{State: "source", Model: defaultModel, Questions: map[string]question{"violation": {Type: "noul", Instructions: "Is this a violation?"}}})
	if err != nil {
		t.Fatal(err)
	}
	if result.Answers["violation"].Noul != 0.82 || result.Model != "jev-1.13.0" {
		t.Fatalf("response = %#v", result)
	}
}

func TestBatchedEvaluatorCombinesSharedStateQuestions(t *testing.T) {
	delegate := &recordingEvaluator{}
	batcher := newBatchedEvaluator(delegate)
	requests := []evaluationRequest{
		{State: map[string]any{"source": "same"}, Model: defaultModel, Questions: map[string]question{"first": {Type: "noul", Instructions: "First?"}}},
		{State: map[string]any{"source": "same"}, Model: defaultModel, Questions: map[string]question{"second": {Type: "noul", Instructions: "Second?"}}},
	}
	results := make([]evaluationResponse, len(requests))
	errors := make([]error, len(requests))
	start := make(chan struct{})
	var workers sync.WaitGroup
	for index := range requests {
		workers.Add(1)
		go func() {
			defer workers.Done()
			<-start
			results[index], errors[index] = batcher.Evaluate(context.Background(), requests[index])
		}()
	}
	close(start)
	workers.Wait()
	for _, err := range errors {
		if err != nil {
			t.Fatal(err)
		}
	}
	delegate.mu.Lock()
	calls := delegate.calls
	delegate.mu.Unlock()
	if calls != 1 {
		t.Fatalf("physical requests = %d, want 1", calls)
	}
	if results[0].Answers["first"].Noul != 0.9 || results[1].Answers["second"].Noul != 0.9 {
		t.Fatalf("answers were not mapped to callers: %#v", results)
	}
}

func TestSemanticRoutingExcludesUnselectedFilesFromFinalJudgment(t *testing.T) {
	rule, err := parseRule("rules/function-naming.md", "---\nglobs:\n  - \"src/**/*.ts\"\n---\n# Name functions by purpose\n\nUse clear function names.")
	if err != nil {
		t.Fatal(err)
	}
	rule.ID = "rule_1"
	rule.Metadata = RuleMetadata{Evaluator: "semantic", Scope: "source", RequiredEvidence: []string{"changed source"}}
	files := []Source{
		{Path: "src/first.ts", Language: "ts", Text: "export const FIRST_ONLY_MARKER = 1;"},
		{Path: "src/second.ts", Language: "ts", Text: "export const SECOND_ONLY_MARKER = 2;"},
	}
	diff := strings.Join([]string{
		"diff --git a/src/first.ts b/src/first.ts",
		"--- a/src/first.ts",
		"+++ b/src/first.ts",
		"@@ -1 +1 @@",
		"-export const first = 0;",
		"+export const FIRST_ONLY_MARKER = 1;",
		"diff --git a/src/second.ts b/src/second.ts",
		"--- a/src/second.ts",
		"+++ b/src/second.ts",
		"@@ -1 +1 @@",
		"-export const second = 0;",
		"+export const SECOND_ONLY_MARKER = 2;",
	}, "\n")
	repository := RepositoryEvidence{
		Paths: []string{"src/first.ts", "src/second.ts"}, ChangedPaths: []string{"src/first.ts", "src/second.ts"},
		Files: files, DiffFiles: diffFilesFromEvidence(diff, []string{"src/first.ts", "src/second.ts"}, nil, files),
	}
	evaluator := &selectingEvaluator{}
	result, err := evaluateSemanticRule(context.Background(), rule, repository, repositoryRelations(repository), Options{Threshold: defaultThreshold, Model: defaultModel}, evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if result.finding.Classification != "violation" {
		t.Fatalf("classification = %q, want violation", result.finding.Classification)
	}
	if bytes.Contains(evaluator.finalRequest, []byte("FIRST_ONLY_MARKER")) || !bytes.Contains(evaluator.finalRequest, []byte("SECOND_ONLY_MARKER")) {
		t.Fatalf("final request crossed routing selection: %s", evaluator.finalRequest)
	}
}

func TestChoiceRoutingBoundsEscapedDescriptions(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example\n\nCheck the source.", Metadata: RuleMetadata{Scope: "source"}}
	options := make([]routeOption[string], maximumChoiceOptions-1)
	for index := range options {
		options[index] = routeOption[string]{
			id:          fmt.Sprintf("candidate_%d", index),
			description: strings.Repeat(`"quoted"\path`, maximumEvidenceSnippetBytes),
			value:       fmt.Sprintf("value_%d", index),
		}
	}
	evaluator := &selectingEvaluator{}
	if _, _, err := askChoice(context.Background(), rule, "path", options, defaultModel, evaluator); err != nil {
		t.Fatal(err)
	}
}

func TestParseRuleExpandsExtensionGlobs(t *testing.T) {
	rule, err := parseRule("rules/example.md", "---\nglobs:\n  - \"**/*.{ts,tsx}\"\n---\n# Example\n\nCheck the source.")
	if err != nil {
		t.Fatal(err)
	}
	if !rule.matchesPath("src/main.ts") || !rule.matchesPath("src/main.tsx") || rule.matchesPath("src/main.go") {
		t.Fatalf("rule patterns do not match expected paths: %#v", rule.Globs)
	}
}

func runGit(t *testing.T, root string, args ...string) {
	t.Helper()
	command := exec.Command("git", args...)
	command.Dir = root
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, output)
	}
}
