package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	appconfig "github.com/andrueandersoncs/better-typescript/internal/config"
)

type evaluatorFunc func(context.Context, evaluationRequest) (evaluationResponse, error)

func (evaluate evaluatorFunc) Evaluate(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
	return evaluate(ctx, request)
}

func testRule(t *testing.T, id, body string) Rule {
	t.Helper()
	source := "---\nglobs:\n  - \"**/*.ts\"\n---\n# " + id + "\n\n" + body + "\n"
	rule, err := parseRule("rules/"+id+".md", source)
	if err != nil {
		t.Fatal(err)
	}
	rule.ID = id
	return rule
}

func TestParseRulePreservesVerbatimSourceAndBuildsExactQuestion(t *testing.T) {
	source := "---\r\nglobs:\r\n  - \"**/*.ts\"\r\n---\r\n# Exact rule\r\n\r\nKeep this text.\r\n"
	rule, err := parseRule("rules/exact.md", source)
	if err != nil {
		t.Fatal(err)
	}
	if rule.Source != source {
		t.Fatalf("rule source changed:\n%q\nwant:\n%q", rule.Source, source)
	}
	question := questionForRule(rule)
	if question.Type != "noul" {
		t.Fatalf("question type = %q", question.Type)
	}
	want := "Does the `file` violate the following rule?\n\nRule:\n" + source
	if question.Instructions != want {
		t.Fatalf("instructions = %q, want %q", question.Instructions, want)
	}
	encoded, err := json.Marshal(question)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(encoded, []byte("criteria")) {
		t.Fatalf("question contains criteria: %s", encoded)
	}
}

func TestBuildRequestPartitionsUsesWholeFileAndOneNoulPerRule(t *testing.T) {
	source := Source{Path: "src/example.ts", Text: "const value = 1;\n"}
	rules := []Rule{testRule(t, "first", "First rule."), testRule(t, "second", "Second rule.")}
	partitions, err := buildRequestPartitions(source, rules, "", maximumRequestBytes)
	if err != nil {
		t.Fatal(err)
	}
	if len(partitions) != 1 {
		t.Fatalf("partitions = %d, want 1", len(partitions))
	}
	request := partitions[0].request
	if !reflect.DeepEqual(request.State, map[string]string{"file": source.Text}) {
		t.Fatalf("state = %#v", request.State)
	}
	if len(request.Questions) != len(rules) {
		t.Fatalf("questions = %d, want %d", len(request.Questions), len(rules))
	}
	for _, rule := range rules {
		question, ok := request.Questions[rule.ID]
		if !ok {
			t.Fatalf("missing question for %s", rule.ID)
		}
		if question != questionForRule(rule) {
			t.Fatalf("question for %s changed: %#v", rule.ID, question)
		}
	}
}

func TestEvaluateSourceRunsDeterministicPartitionsConcurrently(t *testing.T) {
	source := Source{Path: "src/example.ts", Text: "export const value = 1;\n"}
	rules := []Rule{
		testRule(t, "first", strings.Repeat("a", 17_000)),
		testRule(t, "second", strings.Repeat("b", 17_000)),
	}
	partitions, err := buildRequestPartitions(source, rules, "", maximumRequestBytes)
	if err != nil {
		t.Fatal(err)
	}
	if len(partitions) != 2 {
		t.Fatalf("partitions = %d, want 2", len(partitions))
	}
	started := make(chan struct{}, len(partitions))
	release := make(chan struct{})
	var mu sync.Mutex
	var requests []evaluationRequest
	evaluator := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		mu.Lock()
		requests = append(requests, request)
		mu.Unlock()
		started <- struct{}{}
		<-release
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			answers[id] = answer{Type: "noul", Noul: 0.1}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	result := make(chan struct {
		report FindingReport
		err    error
	}, 1)
	go func() {
		report, err := evaluateSource(context.Background(), source, rules, Options{Threshold: defaultThreshold}, evaluator)
		result <- struct {
			report FindingReport
			err    error
		}{report: report, err: err}
	}()
	for range partitions {
		select {
		case <-started:
		case <-time.After(time.Second):
			t.Fatal("request partitions did not start concurrently")
		}
	}
	close(release)
	outcome := <-result
	if outcome.err != nil {
		t.Fatal(outcome.err)
	}
	if len(requests) != 2 {
		t.Fatalf("requests = %d, want 2", len(requests))
	}
	got := []string{outcome.report.Findings[0].RulePath, outcome.report.Findings[1].RulePath}
	want := []string{rules[0].Path, rules[1].Path}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("finding order = %#v, want %#v", got, want)
	}
}

func TestBuildRequestPartitionsRejectsOversizedWholeFile(t *testing.T) {
	source := Source{Path: "src/large.ts", Text: strings.Repeat("x", maximumRequestBytes)}
	_, err := buildRequestPartitions(source, []Rule{testRule(t, "example", "Be clear.")}, "", maximumRequestBytes)
	if err == nil || !strings.Contains(err.Error(), "whole file src/large.ts") {
		t.Fatalf("error = %v", err)
	}
}

func TestRulesForPathAppliesGlobsAndOrderedConfiguration(t *testing.T) {
	rules := []Rule{testRule(t, "first", "First."), testRule(t, "second", "Second.")}
	configuration, err := appconfig.Parse([]byte(`{"commands":[
		{"mode":"semantic","type":"add_exclusions","files":"generated/**","rules":"*"},
		{"mode":"semantic","type":"add_inclusions","files":"generated/**","rules":"second"}
	]}`))
	if err != nil {
		t.Fatal(err)
	}
	commands, err := compileSemanticCommands(rules, configuration)
	if err != nil {
		t.Fatal(err)
	}
	selected := rulesForPath(rules, commands, "generated/output.ts")
	if len(selected) != 1 || selected[0].Path != rules[1].Path {
		t.Fatalf("selected rules = %#v", selected)
	}
	if selected := rulesForPath(rules, commands, "src/output.ts"); len(selected) != 2 {
		t.Fatalf("ordinary source selected %d rules, want 2", len(selected))
	}
}

func TestRangeReadsEndpointWholeFilesAndSkipsDeletedFiles(t *testing.T) {
	root := t.TempDir()
	runGit(t, root, "init", "-q")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test")
	writeTestFile(t, root, "src/keep.ts", "const value = 'start';\n")
	writeTestFile(t, root, "src/delete.ts", "export {};\n")
	runGit(t, root, "add", ".")
	runGit(t, root, "commit", "-qm", "start")
	start := strings.TrimSpace(runGit(t, root, "rev-parse", "HEAD"))
	writeTestFile(t, root, "src/keep.ts", "const value = 'endpoint';\n")
	if err := os.Remove(filepath.Join(root, "src/delete.ts")); err != nil {
		t.Fatal(err)
	}
	runGit(t, root, "add", "-A")
	runGit(t, root, "commit", "-qm", "end")
	end := strings.TrimSpace(runGit(t, root, "rev-parse", "HEAD"))
	writeTestFile(t, root, "src/keep.ts", "const value = 'working tree';\n")

	snapshot, err := gitRangeSnapshot(context.Background(), root, start+".."+end)
	if err != nil {
		t.Fatal(err)
	}
	sources, err := loadSelectedSources(context.Background(), root, snapshot)
	if err != nil {
		t.Fatal(err)
	}
	want := []Source{{Path: "src/keep.ts", Text: "const value = 'endpoint';\n"}}
	if !reflect.DeepEqual(sources, want) {
		t.Fatalf("sources = %#v, want %#v", sources, want)
	}
}

func TestClassifyProbabilityUsesPassReviewAndViolationBoundaries(t *testing.T) {
	cases := map[float64]string{0: "pass", 0.4: "pass", 0.4001: "review", 0.6999: "review", 0.7: "violation", 1: "violation"}
	for probability, want := range cases {
		if got := classifyProbability(probability, 0.7); got != want {
			t.Fatalf("classifyProbability(%v) = %q, want %q", probability, got, want)
		}
	}
}

func TestRunDryRunNeedsNoTypeSafeCredentials(t *testing.T) {
	root := newSemanticTestRepository(t)
	writeTestFile(t, root, "src/example.ts", "const values = [1, 2] as const;\n")
	t.Setenv("TYPESAFE_API_KEY", "")
	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--dry-run", "--rules", "readonly"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d", exitCode)
	}
	var plan DryRunPlan
	if err := json.Unmarshal(output.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if plan.Kind != "dry-run-plan" || plan.Model != defaultModel || len(plan.Files) != 1 || plan.Files[0].Path != "src/example.ts" || plan.Files[0].FileBytes != len("const values = [1, 2] as const;\n") {
		t.Fatalf("plan = %#v", plan)
	}
	if len(plan.Files[0].Rules) != 1 || len(plan.Files[0].Partitions) != 1 || plan.Files[0].Partitions[0].QuestionCount != 1 {
		t.Fatalf("file plan = %#v", plan.Files[0])
	}
}

func TestRunSendsExactWholeFileNoulRequest(t *testing.T) {
	root := newSemanticTestRepository(t)
	file := "const values = [1, 2] as const;\n"
	writeTestFile(t, root, "src/example.ts", file)
	var recorded evaluationRequest
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1/systemone" {
			t.Errorf("path = %s", request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer secret" {
			t.Errorf("authorization = %q", request.Header.Get("Authorization"))
		}
		if err := json.NewDecoder(request.Body).Decode(&recorded); err != nil {
			t.Error(err)
		}
		if recorded.Model == "" {
			http.Error(writer, "body.model: Field required", http.StatusUnprocessableEntity)
			return
		}
		answers := make(map[string]answer, len(recorded.Questions))
		for id := range recorded.Questions {
			answers[id] = answer{Type: "noul", Noul: 0.9}
		}
		_ = json.NewEncoder(writer).Encode(evaluationResponse{Model: "jev-test", Answers: answers})
	}))
	defer server.Close()
	t.Setenv("TYPESAFE_API_KEY", "secret")
	t.Setenv("TYPESAFE_BASE_URL", server.URL)
	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--rules", "readonly", "--json"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 1 {
		t.Fatalf("exit code = %d, output = %s", exitCode, output.String())
	}
	if !reflect.DeepEqual(recorded.State, map[string]string{"file": file}) {
		t.Fatalf("state = %#v", recorded.State)
	}
	if recorded.Model != "jev-latest" {
		t.Fatalf("default model = %q, want jev-latest", recorded.Model)
	}
	if len(recorded.Questions) != 1 {
		t.Fatalf("questions = %#v", recorded.Questions)
	}
	rules, err := loadRules(root, ".better-typescript/rules")
	if err != nil {
		t.Fatal(err)
	}
	selected, err := selectSemanticRules(rules, []string{"readonly"})
	if err != nil {
		t.Fatal(err)
	}
	for _, question := range recorded.Questions {
		if question != questionForRule(selected[0]) {
			t.Fatalf("question = %#v, want %#v", question, questionForRule(selected[0]))
		}
	}
}

func TestEmbeddedCatalogMatchesWholeFileManifest(t *testing.T) {
	content, err := os.ReadFile("testdata/surviving-rules.txt")
	if err != nil {
		t.Fatal(err)
	}
	want := strings.Fields(string(content))
	sources, err := embeddedRuleSources()
	if err != nil {
		t.Fatal(err)
	}
	got := make([]string, len(sources))
	for index, source := range sources {
		got[index] = strings.TrimSuffix(strings.TrimPrefix(source.path, "rules/"), ".md")
	}
	sort.Strings(got)
	sort.Strings(want)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("embedded rules do not match whole-file manifest\ngot:  %q\nwant: %q", got, want)
	}
	if len(got) != 111 {
		t.Fatalf("embedded rules = %d, want 111", len(got))
	}
}

func TestParseOptionsRejectsRemovedPipelines(t *testing.T) {
	for _, option := range []string{"--review-context", "--trace", "--speculative-routing", "--deterministic"} {
		if _, _, err := parseOptions([]string{option}); err == nil {
			t.Fatalf("%s was accepted", option)
		}
	}
}

func newSemanticTestRepository(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	runGit(t, root, "init", "-q")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test")
	writeTestFile(t, root, "src/example.ts", "export {};\n")
	runGit(t, root, "add", ".")
	runGit(t, root, "commit", "-qm", "initial")
	return root
}

func writeTestFile(t *testing.T, root, path, content string) {
	t.Helper()
	absolute := filepath.Join(root, filepath.FromSlash(path))
	if err := os.MkdirAll(filepath.Dir(absolute), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(absolute, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func runGit(t *testing.T, root string, args ...string) string {
	t.Helper()
	command := exec.Command("git", args...)
	command.Dir = root
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, output)
	}
	return string(output)
}

func Example_questionForRule() {
	rule := Rule{Source: "# Prefer clear names\n"}
	fmt.Println(questionForRule(rule).Instructions)
	// Output:
	// Does the `file` violate the following rule?
	//
	// Rule:
	// # Prefer clear names
}
