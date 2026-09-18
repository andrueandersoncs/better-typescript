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
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

type routingEvaluator struct {
	mu          sync.Mutex
	choiceCalls int
}

func (evaluator *routingEvaluator) Evaluate(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
	answers := make(map[string]answer, len(request.Questions))
	for id, question := range request.Questions {
		if question.Type == "choice" {
			evaluator.mu.Lock()
			evaluator.choiceCalls++
			evaluator.mu.Unlock()
			options := make([]string, 0, len(question.Criteria))
			for option := range question.Criteria {
				if option != "none" {
					options = append(options, option)
				}
			}
			slices.Sort(options)
			selected := options[0]
			probabilities := make(map[string]float64, len(question.Criteria))
			for option := range question.Criteria {
				probabilities[option] = 0
			}
			probabilities[selected] = 0.9
			probabilities["none"] = 0.1
			answers[id] = answer{Type: "choice", Choice: selected, Confidence: 0.9, Probabilities: probabilities}
			continue
		}
		answers[id] = answer{Type: "noul", Noul: 0.9}
	}
	return evaluationResponse{Model: "test-model", Answers: answers, Usage: Usage{InputTokens: 1, OutputTokens: 1}}, nil
}

type evaluatorFunc func(context.Context, evaluationRequest) (evaluationResponse, error)

func (evaluate evaluatorFunc) Evaluate(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
	return evaluate(ctx, request)
}

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

type noneEvaluator struct {
	calls int
}

func (evaluator *noneEvaluator) Evaluate(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
	evaluator.calls++
	answers := make(map[string]answer, len(request.Questions))
	for id, question := range request.Questions {
		if question.Type == "choice" {
			answers[id] = answer{Type: "choice", Choice: "none", Confidence: 1, Probabilities: map[string]float64{"none": 1}}
			continue
		}
		answers[id] = answer{Type: "noul", Noul: 0}
	}
	return evaluationResponse{Model: "test-model", Answers: answers}, nil
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
func TestDiffEvidenceMatchesReferenceIdentifiersAndHeaders(t *testing.T) {
	diff := strings.Join([]string{
		"diff --git a/tracked.ts b/tracked.ts",
		"--- a/tracked.ts",
		"+++ b/tracked.ts",
		"@@ -1 +1 @@",
		"-export const value = 1;",
		"+export const value = 2;",
	}, "\n")
	files := []Source{
		{Path: "a.ts", Text: "export const a = 1;"},
		{Path: "tracked.ts", Text: "export const value = 2;"},
		{Path: "z.ts", Text: "export const z = 1;"},
	}
	result := diffFilesFromEvidence(diff, []string{"a.ts", "tracked.ts", "z.ts"}, nil, files)
	if len(result) != 3 {
		t.Fatalf("diff files = %d, want 3", len(result))
	}
	if result[0].ID != "file_1" || result[0].Hunks[0].Header != "@@ -1 +1 @@" {
		t.Fatalf("parsed diff = %#v", result[0])
	}
	if result[1].ID != "file_2" || result[2].ID != "file_4" {
		t.Fatalf("addition identifiers = %q, %q; want file_2, file_4", result[1].ID, result[2].ID)
	}
}

func TestRunDeterministicSkipsTypeSafe(t *testing.T) {
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
	if err := os.WriteFile(file, []byte("export const value = 2;\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--deterministic", "--json"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	if !strings.Contains(output.String(), `"model": "local"`) || strings.Contains(output.String(), `<routed-evidence>`) {
		t.Fatalf("unexpected deterministic output: %s", output.String())
	}
}

func TestRunCommitRangeUsesCommittedEndpoint(t *testing.T) {
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
	if err := os.WriteFile(file, []byte("export const COMMITTED_RANGE_MARKER = 1;\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	runGit(t, root, "add", ".")
	runGit(t, root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--quiet", "-m", "change")
	if err := os.WriteFile(file, []byte("export const WORKTREE_MARKER = 2;\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	snapshot, err := gitSnapshot(context.Background(), root, "HEAD~1...HEAD")
	if err != nil {
		t.Fatal(err)
	}
	evidence, err := buildRepositoryEvidence(context.Background(), root, snapshot, "")
	if err != nil {
		t.Fatal(err)
	}
	var source string
	for _, candidate := range evidence.Files {
		if candidate.Path == "src/main.ts" {
			source = candidate.Text
			break
		}
	}
	if !strings.Contains(source, "COMMITTED_RANGE_MARKER") || strings.Contains(source, "WORKTREE_MARKER") {
		t.Fatalf("range evidence did not come from its endpoint commit: %q", source)
	}

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--range", "HEAD~1...HEAD", "--dry-run"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 || !strings.Contains(output.String(), `"path":"src/main.ts"`) {
		t.Fatalf("range dry run = exit %d, output %s", exitCode, output.String())
	}
}

func TestSplitCommitRangeRejectsIncompleteRange(t *testing.T) {
	for _, value := range []string{"HEAD", "..HEAD", "HEAD..", "HEAD..main..other"} {
		if _, _, _, err := splitCommitRange(value); err == nil {
			t.Errorf("splitCommitRange(%q) succeeded", value)
		}
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
		if !bytes.Contains(body, []byte(`"type":"noul"`)) || !bytes.Contains(body, []byte(`"model":"jev-latest"`)) {
			t.Errorf("request does not contain a Noul question and SDK default model: %s", body)
		}
		response.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(response, `{"model":"jev-1.13.0","answers":{"violation":{"type":"noul","noul":0.82}},"usage":{"input_tokens":12,"output_tokens":3}}`)
	}))
	defer server.Close()
	client := &typeSafeClient{apiKey: "secret", baseURL: server.URL, client: server.Client()}
	result, err := client.Evaluate(context.Background(), evaluationRequest{State: "source", Questions: map[string]question{"violation": {Type: "noul", Instructions: "Is this a violation?"}}})
	if err != nil {
		t.Fatal(err)
	}
	if result.Answers["violation"].Noul != 0.82 || result.Model != "jev-1.13.0" {
		t.Fatalf("response = %#v", result)
	}
}

func TestBatchedEvaluatorCombinesSharedStateQuestions(t *testing.T) {
	delegate := &recordingEvaluator{}
	batcher := newBatchedEvaluator(delegate, maximumRequestBytes)
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
	totalUsage := Usage{}
	for _, result := range results {
		totalUsage.InputTokens += result.Usage.InputTokens
		totalUsage.OutputTokens += result.Usage.OutputTokens
	}
	if totalUsage != (Usage{InputTokens: 10, OutputTokens: 2}) {
		t.Fatalf("shared usage = %#v, want one physical response", totalUsage)
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

func TestSemanticRoutingWithoutRepositoryEvidenceIsNotApplicable(t *testing.T) {
	rule := Rule{
		ID:         "rule_1",
		Path:       "rules/example.md",
		Title:      "Example",
		Definition: "# Example\n\nCheck the repository.",
		Globs:      []string{"**/*.ts"},
		Metadata:   RuleMetadata{Evaluator: "semantic", Scope: "repository"},
	}
	repository := RepositoryEvidence{
		Paths:        []string{"src/main.ts"},
		ChangedPaths: []string{"src/main.ts"},
		Files:        []Source{{Path: "src/main.ts", Language: "ts", Text: "export const value = 1;"}},
		DiffFiles: []DiffFile{{
			ID:     "file_1",
			Path:   "src/main.ts",
			Status: "modified",
			Hunks:  []DiffHunk{{ID: "file_1_hunk_1", Path: "src/main.ts", NewStartLine: 1, NewLineCount: 1}},
		}},
	}

	evaluator := &noneEvaluator{}
	result, err := evaluateSemanticRule(context.Background(), rule, repository, repositoryRelations(repository), Options{Threshold: defaultThreshold, Model: defaultModel}, evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if evaluator.calls != 0 {
		t.Fatalf("evaluation calls = %d, want 0 without a routed candidate", evaluator.calls)
	}
	if result.finding.Classification != "not_applicable" {
		t.Fatalf("classification = %q, want not_applicable", result.finding.Classification)
	}
}

func TestNoneChoiceStopsBeforeRelevanceEvaluation(t *testing.T) {
	rule, err := parseRule("rules/function-naming.md", "---\nglobs:\n  - \"src/**/*.ts\"\n---\n# Name functions by purpose\n\nUse clear function names.")
	if err != nil {
		t.Fatal(err)
	}
	rule.ID = "rule_1"
	rule.Metadata = RuleMetadata{Evaluator: "semantic", Scope: "source"}
	files := []Source{
		{Path: "src/first.ts", Language: "ts", Text: "export const first = 1;"},
		{Path: "src/second.ts", Language: "ts", Text: "export const second = 2;"},
	}
	repository := RepositoryEvidence{
		Paths:        []string{"src/first.ts", "src/second.ts"},
		ChangedPaths: []string{"src/first.ts", "src/second.ts"},
		Files:        files,
		DiffFiles:    diffFilesFromEvidence("", []string{"src/first.ts", "src/second.ts"}, nil, files),
	}
	evaluator := &noneEvaluator{}
	result, err := evaluateSemanticRule(context.Background(), rule, repository, repositoryRelations(repository), Options{Threshold: defaultThreshold}, evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if result.finding.Classification != "not_applicable" {
		t.Fatalf("classification = %q, want not_applicable", result.finding.Classification)
	}
	if evaluator.calls != 1 {
		t.Fatalf("evaluation calls = %d, want only the path Choice", evaluator.calls)
	}
}

func TestFileDescriptionMatchesReferenceSummary(t *testing.T) {
	description := fileDescription(DiffFile{
		Path:   "src/main.ts",
		Status: "modified",
		Hunks: []DiffHunk{
			{Header: "first", Patch: "FIRST_PATCH"},
			{Header: "second", Patch: "SECOND_PATCH"},
			{Header: "third"},
			{Header: "fourth"},
			{Header: "fifth"},
		},
	})
	if description != "modified src/main.ts; first; second; third; fourth" {
		t.Fatalf("description = %q", description)
	}
	if strings.Contains(description, "PATCH") {
		t.Fatalf("description includes patch text: %q", description)
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
	if _, _, _, err := askChoice(context.Background(), rule, "path", options, defaultModel, evaluator); err != nil {
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

func TestDistinctFilenamesIncludesHiddenDirectories(t *testing.T) {
	repository := RepositoryEvidence{Paths: []string{
		".agents/skills/first/SKILL.md",
		".agents/skills/second/SKILL.md",
		"src/first/model.ts",
		"src/second/model.ts",
	}}

	result := distinctFilenames(repository)

	if result.classification != "violation" {
		t.Fatalf("classification = %q, want violation", result.classification)
	}
	paths := make([]string, len(result.evidence))
	for index, evidence := range result.evidence {
		paths[index] = evidence.Path
	}
	want := []string{".agents/skills/first/SKILL.md", ".agents/skills/second/SKILL.md", "src/first/model.ts", "src/second/model.ts"}
	if !slices.Equal(paths, want) {
		t.Fatalf("evidence = %#v, want %#v", paths, want)
	}
}

func TestParseRuleAcceptsReferenceYAMLFrontmatter(t *testing.T) {
	rule, err := parseRule("rules/example.md", "---\r\nglobs: [\"src/**/*.ts\", \"test/**/*.ts\"]\r\nowner: team\r\n---\r\n# Example\r\n\r\nCheck the source.")
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(rule.Globs, []string{"src/**/*.ts", "test/**/*.ts"}) {
		t.Fatalf("globs = %#v", rule.Globs)
	}
}

func TestImportSpecifiersMatchReferenceScanner(t *testing.T) {
	source := Source{
		Path: "src/sample.ts",
		Text: strings.Join([]string{
			`// import "ignored-comment";`,
			`const text = "require('ignored-string')";`,
			`import value from "static-package";`,
			`import type { TypeOnly } from "ignored-type-package";`,
			`import { type Hidden, visible } from "mixed-package";`,
			`export { other } from "export-package";`,
			`export type { ExportType } from "ignored-export-type-package";`,
			`const lazy = import("dynamic-package");`,
			`const common = require("ignored-common-package");`,
			`type Remote = import("ignored-import-type-package").Remote;`,
			`import legacy = require("ignored-legacy-package");`,
		}, "\n"),
	}
	want := []string{"static-package", "mixed-package", "export-package", "dynamic-package"}
	if got := importSpecifiers(source); !slices.Equal(got, want) {
		t.Fatalf("imports = %#v, want %#v", got, want)
	}
}

func TestChoiceRoutingRecursesThroughLargeBucketSets(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example\n\nCheck the source.", Metadata: RuleMetadata{Scope: "source"}}
	options := make([]routeOption[string], (maximumChoiceOptions-1)*(maximumChoiceOptions-1)+1)
	for index := range options {
		options[index] = routeOption[string]{
			id:          fmt.Sprintf("candidate_%03d", index),
			description: fmt.Sprintf("candidate %03d", index),
			value:       fmt.Sprintf("value_%03d", index),
		}
	}
	evaluator := &routingEvaluator{}
	result, err := routeOptions(context.Background(), rule, "path", options, "", evaluator, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.selected) != 1 || result.selected[0].value != "value_000" {
		t.Fatalf("selected = %#v", result.selected)
	}
	evaluator.mu.Lock()
	choiceCalls := evaluator.choiceCalls
	evaluator.mu.Unlock()
	if choiceCalls != 3 {
		t.Fatalf("choice calls = %d, want 3 recursive routing layers", choiceCalls)
	}
}

func TestOversizedChoiceStopsWithoutEvaluation(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: strings.Repeat("x", maximumRequestBytes), Metadata: RuleMetadata{Scope: "source"}}
	options := []routeOption[string]{
		{id: "first", description: "first", value: "first"},
		{id: "second", description: "second", value: "second"},
	}
	evaluator := &recordingEvaluator{}
	_, answered, _, err := askChoice(context.Background(), rule, "path", options, "", evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if answered {
		t.Fatal("oversized Choice request was evaluated")
	}
	evaluator.mu.Lock()
	calls := evaluator.calls
	evaluator.mu.Unlock()
	if calls != 0 {
		t.Fatalf("physical requests = %d, want 0", calls)
	}
}

func TestBatchedEvaluatorDoesNotLimitPhysicalConcurrency(t *testing.T) {
	const requestCount = 16
	started := make(chan struct{}, requestCount)
	release := make(chan struct{})
	var releaseOnce sync.Once
	delegate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		started <- struct{}{}
		<-release
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			answers[id] = answer{Type: "noul", Noul: 0.9}
		}
		return evaluationResponse{Model: "test-model", Answers: answers}, nil
	})
	batcher := newBatchedEvaluator(delegate, maximumRequestBytes)
	start := make(chan struct{})
	var workers sync.WaitGroup
	for index := range requestCount {
		workers.Add(1)
		go func() {
			defer workers.Done()
			<-start
			request := evaluationRequest{
				State:     map[string]any{"request": index},
				Questions: map[string]question{"answer": {Type: "noul", Instructions: "question"}},
			}
			if _, err := batcher.Evaluate(context.Background(), request); err != nil {
				t.Errorf("evaluate: %v", err)
			}
		}()
	}
	close(start)
	for range requestCount {
		select {
		case <-started:
		case <-time.After(2 * time.Second):
			t.Fatal("physical requests did not run concurrently")
		}
	}
	releaseOnce.Do(func() { close(release) })
	workers.Wait()
}

func TestFinalRequestSeparatesChangedAndSupportingEvidence(t *testing.T) {
	request := finalRequest(
		Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example", Metadata: RuleMetadata{Scope: "repository"}},
		[]Evidence{
			{ID: "support", Kind: "repository-context", Path: "package.json", Snippet: "{}"},
			{ID: "changed", Kind: "diff-hunk", Path: "src/main.ts", Snippet: "+change"},
		},
		"",
	)
	encoded, err := marshalJSON(request)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(encoded, []byte(`{"state":{"changedEvidence":[{"id":"changed"`)) {
		t.Fatalf("request does not lead with changed evidence: %s", encoded)
	}
	if !bytes.Contains(encoded, []byte(`"supportingEvidence":[{"id":"support"`)) {
		t.Fatalf("request does not separate supporting evidence: %s", encoded)
	}
	trueIndex := bytes.Index(encoded, []byte(`"true":"The candidate contains`))
	falseIndex := bytes.Index(encoded, []byte(`"false":"The supplied evidence`))
	if trueIndex < 0 || falseIndex < 0 || trueIndex > falseIndex {
		t.Fatalf("request criteria do not retain reference order: %s", encoded)
	}
	if !bytes.Contains(encoded, []byte("Judge only `changedEvidence`.")) {
		t.Fatalf("request lacks changed-evidence guidance: %s", encoded)
	}
}

func TestDefaultModelIsOmittedFromRequests(t *testing.T) {
	encoded, err := json.Marshal(evaluationRequest{
		State:     map[string]any{"source": true},
		Questions: map[string]question{"answer": {Type: "noul", Instructions: "question"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(encoded, []byte(`"model"`)) {
		t.Fatalf("default request includes model override: %s", encoded)
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
