package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

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

func TestWorkingTreeSkipsUnstagedDeletedFiles(t *testing.T) {
	root := newSemanticTestRepository(t)
	writeTestFile(t, root, "src/keep.ts", "const value = 'start';\n")
	runGit(t, root, "add", ".")
	runGit(t, root, "commit", "-qm", "keep")
	writeTestFile(t, root, "src/keep.ts", "const value = 'working tree';\n")
	if err := os.Remove(filepath.Join(root, "src/example.ts")); err != nil {
		t.Fatal(err)
	}

	changes, err := gitSnapshot(context.Background(), root, "")
	if err != nil {
		t.Fatal(err)
	}
	all, err := selectCurrentFiles(root, changes, nil, true)
	if err != nil {
		t.Fatal(err)
	}
	want := []Source{{Path: "src/keep.ts", Text: "const value = 'working tree';\n"}}
	for name, snapshot := range map[string]repositorySnapshot{"changes": changes, "all": all} {
		sources, err := loadSelectedSources(context.Background(), root, snapshot)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if !reflect.DeepEqual(sources, want) {
			t.Fatalf("%s: sources = %#v, want %#v", name, sources, want)
		}
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

func TestRunSelectsCandidateSpansBeforeFinalJudgment(t *testing.T) {
	root := newSemanticTestRepository(t)
	source := strings.Repeat("export const safe = 1;\n", 220) + "export const VIOLATION = true;\n"
	writeTestFile(t, root, "src/example.ts", source)
	var requests []evaluationRequest
	var mu sync.Mutex
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		var received evaluationRequest
		if err := json.NewDecoder(request.Body).Decode(&received); err != nil {
			t.Error(err)
			return
		}
		mu.Lock()
		requests = append(requests, received)
		mu.Unlock()
		probability := 0.1
		if strings.Contains(received.State["file"], "VIOLATION") {
			probability = 0.9
		}
		answers := make(map[string]answer, len(received.Questions))
		for id := range received.Questions {
			if strings.HasPrefix(id, "block_") {
				answers[id] = testEvidenceAnswer(received, id, "VIOLATION")
			} else {
				answers[id] = answer{Type: "noul", Noul: probability}
			}
		}
		_ = json.NewEncoder(writer).Encode(evaluationResponse{Model: "jev-test", Answers: answers})
	}))
	defer server.Close()
	t.Setenv("TYPESAFE_API_KEY", "secret")
	t.Setenv("TYPESAFE_BASE_URL", server.URL)
	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--files", "src/example.ts", "--rules", "effect/separate-service-interfaces-from-layer-construction", "--json"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 1 {
		t.Fatalf("exit code = %d, output = %s", exitCode, output.String())
	}
	var reports []struct {
		Findings []struct {
			Classification       string  `json:"classification"`
			ViolationProbability float64 `json:"violationProbability"`
			EvidenceScope        string  `json:"evidenceScope"`
			CandidateRanges      []struct {
				StartByte int `json:"startByte"`
				EndByte   int `json:"endByte"`
			} `json:"candidateRanges"`
		} `json:"findings"`
	}
	if err := json.Unmarshal(output.Bytes(), &reports); err != nil {
		t.Fatal(err)
	}
	if len(reports) != 1 || len(reports[0].Findings) != 1 {
		t.Fatalf("reports = %s", output.String())
	}
	finding := reports[0].Findings[0]
	if finding.Classification != "violation" || finding.ViolationProbability != 0.9 || finding.EvidenceScope != "localized" || len(finding.CandidateRanges) != 1 {
		t.Fatalf("finding = %#v", finding)
	}
	region := finding.CandidateRanges[0]
	if region.StartByte <= 0 || region.EndByte != len(source) || !strings.Contains(source[region.StartByte:region.EndByte], "VIOLATION") {
		t.Fatalf("candidate range = %#v", region)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(requests) < 3 {
		t.Fatalf("requests = %d, want multiple selection requests and one final request", len(requests))
	}
	foundFinal := false
	for _, received := range requests {
		if _, evidence := received.State["policy"]; evidence {
			continue
		}
		if len(received.Questions) < 1 || len(received.Questions) > 2 {
			t.Fatalf("questions = %#v", received.Questions)
		}
		if len(received.Questions) == 2 {
			foundFinal = true
			if len(received.State["file"]) >= len(source) || !strings.Contains(received.State["file"], "VIOLATION") {
				t.Fatalf("final state = %q", received.State["file"])
			}
		}
	}
	if !foundFinal {
		t.Fatal("no final Noul question")
	}
}

func TestRunRecomposesDistantCandidateSpans(t *testing.T) {
	root := newSemanticTestRepository(t)
	source := "const VIOLATION_A = true;\n" + strings.Repeat("const safe = true;\n", 450) + "const VIOLATION_B = true;\n"
	writeTestFile(t, root, "src/example.ts", source)
	var finalState string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		var received evaluationRequest
		if err := json.NewDecoder(request.Body).Decode(&received); err != nil {
			t.Error(err)
			return
		}
		answers := make(map[string]answer, len(received.Questions))
		for id := range received.Questions {
			if strings.HasPrefix(id, "block_") {
				answers[id] = testEvidenceAnswer(received, id, "VIOLATION_A", "VIOLATION_B")
				continue
			}
			probability := 0.1
			if len(received.Questions) == 2 {
				finalState = received.State["file"]
				if strings.Contains(finalState, "VIOLATION_A") && strings.Contains(finalState, "VIOLATION_B") {
					probability = 0.9
				}
			} else if strings.Contains(received.State["file"], "VIOLATION_A") || strings.Contains(received.State["file"], "VIOLATION_B") {
				probability = 0.8
			}
			answers[id] = answer{Type: "noul", Noul: probability}
		}
		_ = json.NewEncoder(writer).Encode(evaluationResponse{Model: "jev-test", Answers: answers})
	}))
	defer server.Close()
	t.Setenv("TYPESAFE_API_KEY", "secret")
	t.Setenv("TYPESAFE_BASE_URL", server.URL)
	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--files", "src/example.ts", "--rules", "effect/separate-service-interfaces-from-layer-construction", "--json"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	var reports []FindingReport
	if err := json.Unmarshal(output.Bytes(), &reports); err != nil {
		t.Fatal(err)
	}
	if exitCode != 1 || len(reports) != 1 || len(reports[0].Findings) != 1 {
		t.Fatalf("exit=%d reports=%s", exitCode, output.String())
	}
	finding := reports[0].Findings[0]
	if finding.Classification != "violation" || finding.ViolationProbability == nil || *finding.ViolationProbability != 0.9 || len(finding.CandidateRanges) != 2 {
		t.Fatalf("finding = %#v", finding)
	}
	first, second := finding.CandidateRanges[0], finding.CandidateRanges[1]
	if first.StartLine != 1 || second.StartLine <= first.EndLine ||
		!strings.Contains(source[first.StartByte:first.EndByte], "VIOLATION_A") ||
		!strings.Contains(source[second.StartByte:second.EndByte], "VIOLATION_B") ||
		len(finalState) >= len(source) {
		t.Fatalf("ranges = %#v; final state = %q", finding.CandidateRanges, finalState)
	}
}

func TestRunUsesFinalVerdictRatherThanCandidateScore(t *testing.T) {
	root := newSemanticTestRepository(t)
	writeTestFile(t, root, "src/example.ts", "export const value = 1;\n")
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		var received evaluationRequest
		if err := json.NewDecoder(request.Body).Decode(&received); err != nil {
			t.Error(err)
			return
		}
		calls++
		answers := make(map[string]answer, len(received.Questions))
		for id := range received.Questions {
			probability := 0.95
			if len(received.Questions) == 2 && !strings.HasSuffix(id, "_applies") {
				probability = 0.1
			}
			answers[id] = answer{Type: "noul", Noul: probability}
		}
		_ = json.NewEncoder(writer).Encode(evaluationResponse{Model: "jev-test", Answers: answers})
	}))
	defer server.Close()
	t.Setenv("TYPESAFE_API_KEY", "secret")
	t.Setenv("TYPESAFE_BASE_URL", server.URL)
	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--files", "src/example.ts", "--rules", "effect/separate-service-interfaces-from-layer-construction", "--json"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	var reports []FindingReport
	if err := json.Unmarshal(output.Bytes(), &reports); err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 || calls != 2 || len(reports) != 1 || len(reports[0].Findings) != 1 {
		t.Fatalf("exit=%d calls=%d reports=%s", exitCode, calls, output.String())
	}
	finding := reports[0].Findings[0]
	if finding.Classification != "pass" || finding.ViolationProbability == nil || *finding.ViolationProbability != 0.1 || finding.EvidenceScope != "file" || len(finding.CandidateRanges) != 1 {
		t.Fatalf("finding = %#v", finding)
	}
}

func TestRunReportsNoCandidateAsInconclusiveWithoutFinalJudgment(t *testing.T) {
	root := newSemanticTestRepository(t)
	writeTestFile(t, root, "src/example.ts", "export const value = 1;\n")
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		calls++
		var received evaluationRequest
		if err := json.NewDecoder(request.Body).Decode(&received); err != nil {
			t.Error(err)
			return
		}
		answers := make(map[string]answer, len(received.Questions))
		for id := range received.Questions {
			answers[id] = answer{Type: "noul", Noul: 0.1}
		}
		_ = json.NewEncoder(writer).Encode(evaluationResponse{Model: "jev-test", Answers: answers})
	}))
	defer server.Close()
	t.Setenv("TYPESAFE_API_KEY", "secret")
	t.Setenv("TYPESAFE_BASE_URL", server.URL)
	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--files", "src/example.ts", "--rules", "effect/separate-service-interfaces-from-layer-construction", "--json"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	var reports []FindingReport
	if err := json.Unmarshal(output.Bytes(), &reports); err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 || calls != 1 || len(reports) != 1 || len(reports[0].Findings) != 1 {
		t.Fatalf("exit=%d calls=%d reports=%s", exitCode, calls, output.String())
	}
	finding := reports[0].Findings[0]
	if finding.Classification != "inconclusive" || finding.ViolationProbability != nil || finding.EvidenceScope != "" || len(finding.CandidateRanges) != 0 {
		t.Fatalf("finding = %#v", finding)
	}
}

func TestRunDoesNotJudgeTruncatedCandidateContext(t *testing.T) {
	root := newSemanticTestRepository(t)
	source := strings.Repeat("export const relevant = true;\n", 2_800)
	writeTestFile(t, root, "src/example.ts", source)
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		var received evaluationRequest
		if err := json.NewDecoder(request.Body).Decode(&received); err != nil {
			t.Error(err)
			return
		}
		if len(received.Questions) == 2 {
			t.Error("final judgment ran with truncated context")
		}
		calls.Add(1)
		answers := make(map[string]answer, len(received.Questions))
		for id := range received.Questions {
			answers[id] = answer{Type: "noul", Noul: 0.9}
		}
		_ = json.NewEncoder(writer).Encode(evaluationResponse{Model: "jev-test", Answers: answers})
	}))
	defer server.Close()
	t.Setenv("TYPESAFE_API_KEY", "secret")
	t.Setenv("TYPESAFE_BASE_URL", server.URL)
	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--files", "src/example.ts", "--rules", "effect/separate-service-interfaces-from-layer-construction", "--json"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	var reports []FindingReport
	if err := json.Unmarshal(output.Bytes(), &reports); err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 || calls.Load() < 2 || len(reports) != 1 || len(reports[0].Findings) != 1 {
		t.Fatalf("exit=%d calls=%d reports=%s", exitCode, calls.Load(), output.String())
	}
	finding := reports[0].Findings[0]
	if finding.Classification != "inconclusive" || finding.ViolationProbability != nil ||
		finding.Reason != "selected context exceeds the TypeSafe request limit" ||
		len(finding.CandidateRanges) != 1 || finding.CandidateRanges[0].EndByte != len(source) {
		t.Fatalf("finding = %#v", finding)
	}
}

func TestRemovedSemanticPolicySelectorsRejectStaleConfiguration(t *testing.T) {
	rules, err := loadRules(t.TempDir(), "")
	if err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile("testdata/retired-policy-selectors.txt")
	if err != nil {
		t.Fatal(err)
	}
	for _, selector := range strings.Fields(string(content)) {
		t.Run(selector, func(t *testing.T) {
			configuration := appconfig.File{Commands: []appconfig.Command{{
				Mode: appconfig.ModeSemantic, Type: "add_exclusions", Rules: []string{selector},
			}}}
			_, err := compileSemanticCommands(rules, configuration)
			if err == nil || !strings.Contains(err.Error(), "unknown semantic rule: "+selector) {
				t.Fatalf("stale selector %q: expected unknown-rule error, got %v", selector, err)
			}
		})
	}
	for _, selector := range []string{
		"abstraction/abstract-shared-meaning-not-merely-similar-code",
		"switch-case/prefer-match-for-multiple-branches",
	} {
		if _, err := selectSemanticRules(rules, []string{selector}); err != nil {
			t.Fatalf("replacement selector %q: %v", selector, err)
		}
	}
}

func TestParseOptionsRejectsRemovedPipelines(t *testing.T) {
	for _, option := range []string{"--review-context", "--trace", "--speculative-routing", "--deterministic"} {
		if _, _, err := parseOptions([]string{option}); err == nil {
			t.Fatalf("%s was accepted", option)
		}
	}
}

// testEvidenceAnswer selects an evidence block when its text contains any marker.
func testEvidenceAnswer(request evaluationRequest, key string, markers ...string) answer {
	for _, marker := range markers {
		if strings.Contains(request.State[key], marker) {
			return answer{Type: "noul", Noul: 0.9}
		}
	}
	return answer{Type: "noul", Noul: 0.1}
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
