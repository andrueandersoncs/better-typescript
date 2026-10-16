package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"regexp"
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

func TestSelectionSkipsTrackedSymlinks(t *testing.T) {
	root := newSemanticTestRepository(t)
	if err := os.Symlink("../node_modules/missing.js", filepath.Join(root, "src/link.js")); err != nil {
		t.Fatal(err)
	}
	runGit(t, root, "add", ".")
	runGit(t, root, "commit", "-qm", "link")
	head := strings.TrimSpace(runGit(t, root, "rev-parse", "HEAD"))

	changes, err := gitSnapshot(context.Background(), root, "")
	if err != nil {
		t.Fatal(err)
	}
	all, err := selectCurrentFiles(root, changes, nil, true)
	if err != nil {
		t.Fatal(err)
	}
	committed, err := gitRangeSnapshot(context.Background(), root, head+"~1.."+head)
	if err != nil {
		t.Fatal(err)
	}
	for name, snapshot := range map[string]repositorySnapshot{"all": all, "range": committed} {
		sources, err := loadSelectedSources(context.Background(), root, snapshot)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		for _, source := range sources {
			if source.Path == "src/link.js" {
				t.Fatalf("%s selected symlink %q", name, source.Text)
			}
		}
	}
}

func TestRangeWithFilesReadsSelectedFilesAtEndCommit(t *testing.T) {
	root := newSemanticTestRepository(t)
	committed := "const value = 'committed';\n"
	writeTestFile(t, root, "src/example.ts", committed)
	runGit(t, root, "commit", "-qam", "edit")
	writeTestFile(t, root, "src/other.ts", "export {};\n")
	runGit(t, root, "add", ".")
	runGit(t, root, "commit", "-qm", "unrelated")
	writeTestFile(t, root, "src/example.ts", "const value = 'working tree, longer';\n")

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--dry-run", "--range", "HEAD~1..HEAD", "--files", "src/example.ts", "--rules", "readonly"}, &output)
	if err != nil || exitCode != 0 {
		t.Fatalf("exit code = %d, err = %v", exitCode, err)
	}
	var plan DryRunPlan
	if err := json.Unmarshal(output.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if len(plan.Files) != 1 || plan.Files[0].Path != "src/example.ts" || plan.Files[0].FileBytes != len(committed) {
		t.Fatalf("plan = %#v", plan)
	}
}

func TestClassifyProbabilityUsesPassReviewAndViolationBoundaries(t *testing.T) {
	cases := map[float64]string{0: "pass", 0.55: "pass", 0.5501: "review", 0.6999: "review", 0.7: "violation", 1: "violation"}
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

func TestRunSelectsFilesInRepositoryWithoutCommits(t *testing.T) {
	root := t.TempDir()
	runGit(t, root, "init", "-q")
	installDefaultRules(t, root)
	writeTestFile(t, root, "src/staged.ts", "export {};\n")
	writeTestFile(t, root, "src/untracked.ts", "export {};\n")
	runGit(t, root, "add", "src/staged.ts")
	for _, args := range [][]string{{"--dry-run"}, {"--dry-run", "--files", "src/*.ts"}} {
		var output bytes.Buffer
		if _, err := Run(context.Background(), root, append(args, "--rules", "readonly"), &output); err != nil {
			t.Fatalf("%v: %v", args, err)
		}
		var plan DryRunPlan
		if err := json.Unmarshal(output.Bytes(), &plan); err != nil {
			t.Fatal(err)
		}
		if len(plan.Files) != 2 || plan.Files[0].Path != "src/staged.ts" || plan.Files[1].Path != "src/untracked.ts" {
			t.Fatalf("%v: files = %#v", args, plan.Files)
		}
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
		if _, evidence := received.Questions["block_1"]; evidence {
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

// TypeSafe bills state once per request but every question's text separately, so guidance and policy
// text shared by a candidate or evidence request's questions must appear in it exactly once.
func TestRequestsSendSharedTextOnce(t *testing.T) {
	settings := Options{}.requestSettings()
	source := Source{Path: "src/example.ts", Text: strings.Repeat("const value = 1;\n", 400)}
	rules := []Rule{{ID: "rule_1", Source: "First policy text."}, {ID: "rule_2", Source: "Second policy text."}}
	occurrences := func(request evaluationRequest, text string) int {
		body, err := marshalJSON(request)
		if err != nil {
			t.Fatal(err)
		}
		encoded, _ := marshalJSON(text)
		return strings.Count(string(body), strings.Trim(string(encoded), `"`))
	}
	partitions, err := buildRequestPartitions(source, rules, settings, maximumRequestBytes)
	if err != nil {
		t.Fatal(err)
	}
	for _, partition := range partitions {
		if len(partition.request.Questions) != 2 || occurrences(partition.request, settings.prompts.CandidateGuide) != 1 {
			t.Fatalf("candidate request = %#v", partition.request)
		}
	}
	window := sourceWindow{start: 0, end: 4_000}
	evidence := evidenceRequest(source, rules[0], evidenceBlocks(source.Text, window), settings)
	if len(evidence.Questions) < 2 || occurrences(evidence, settings.prompts.EvidenceGuide) != 1 || occurrences(evidence, rules[0].Source) != 1 {
		t.Fatalf("evidence request = %#v", evidence)
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

func TestRunReportsNoCandidateAsPassWithoutFinalJudgment(t *testing.T) {
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
	if finding.Classification != "pass" || finding.Reason != noCandidateReason || finding.ViolationProbability != nil || finding.EvidenceScope != "" || len(finding.CandidateRanges) != 0 {
		t.Fatalf("finding = %#v", finding)
	}
}

func TestFinalScoresNearTheThresholdAreAveraged(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	source := Source{Path: "src/args.ts", Text: "export const parseArgs = (args: string[]) => args.indexOf('--')\n"}
	for _, test := range []struct {
		name           string
		answers        []float64
		classification string
		probability    float64
	}{
		{"inside margin", []float64{0.72, 0.62, 0.64, 0.66, 0.66}, "review", 0.66},
		{"margin edge", []float64{0.65, 0.75, 0.75, 0.75, 0.75}, "violation", 0.73},
		{"outside margin", []float64{0.76}, "violation", 0.76},
	} {
		t.Run(test.name, func(t *testing.T) {
			var finals atomic.Int32
			evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
				answers := make(map[string]answer, len(request.Questions))
				final := len(request.Questions) == 2
				call := 0
				if final {
					call = int(finals.Add(1)) - 1
				}
				for id := range request.Questions {
					probability := 0.9
					if final && !strings.HasSuffix(id, "_applies") {
						probability = test.answers[min(call, len(test.answers)-1)]
					}
					answers[id] = answer{Type: "noul", Noul: probability}
				}
				return evaluationResponse{Model: "jev-test", Answers: answers}, nil
			})
			report, err := evaluateSource(context.Background(), source, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
			if err != nil {
				t.Fatal(err)
			}
			finding := report.Findings[0]
			if int(finals.Load()) != len(test.answers) || finding.Classification != test.classification || *finding.ViolationProbability != test.probability {
				t.Fatalf("finals=%d finding=%#v probability=%v", finals.Load(), finding, *finding.ViolationProbability)
			}
		})
	}
}

func TestRunReadsTypeSafeSettingsFromDotEnvBelowTheEnvironment(t *testing.T) {
	for _, test := range []struct {
		name, environment, want string
	}{
		{"dot env only", "", "file-key"},
		{"environment wins", "env-key", "env-key"},
	} {
		t.Run(test.name, func(t *testing.T) {
			root := newSemanticTestRepository(t)
			var authorization atomic.Value
			server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
				authorization.Store(request.Header.Get("Authorization"))
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
			writeTestFile(t, root, ".env", "# TypeSafe\nexport TYPESAFE_API_KEY=\"file-key\"\nTYPESAFE_BASE_URL="+server.URL+"\n")
			t.Setenv("TYPESAFE_API_KEY", test.environment)
			t.Setenv("TYPESAFE_BASE_URL", "")
			var output bytes.Buffer
			if _, err := Run(context.Background(), root, []string{"--files", "src/example.ts", "--rules", "readonly", "--json"}, &output); err != nil {
				t.Fatal(err)
			}
			if got := authorization.Load(); got != "Bearer "+test.want {
				t.Fatalf("authorization = %v", got)
			}
		})
	}
}

func TestRunJudgesOversizedEvidenceInChunks(t *testing.T) {
	root := newSemanticTestRepository(t)
	source := strings.Repeat("export const relevant = true;\n", 2_800)
	writeTestFile(t, root, "src/example.ts", source)
	label := regexp.MustCompile(`(?m)^\[source lines \d+-\d+\]\n`)
	var mutex sync.Mutex
	finalBytes, finalCalls := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Error(err)
			return
		}
		var received evaluationRequest
		if err := json.Unmarshal(body, &received); err != nil {
			t.Error(err)
			return
		}
		if len(received.Questions) == 2 {
			if len(body) > maximumRequestBytes {
				t.Errorf("final request has %d bytes", len(body))
			}
			mutex.Lock()
			finalCalls++
			finalBytes += len(label.ReplaceAllString(received.State["file"], ""))
			mutex.Unlock()
		}
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
	if exitCode != 1 || finalCalls < 2 || finalBytes != len(source) || len(reports) != 1 || len(reports[0].Findings) != 1 {
		t.Fatalf("exit=%d finalCalls=%d finalBytes=%d reports=%s", exitCode, finalCalls, finalBytes, output.String())
	}
	finding := reports[0].Findings[0]
	if finding.Classification != "violation" || finding.ViolationProbability == nil ||
		len(finding.CandidateRanges) != 1 || finding.CandidateRanges[0].EndByte != len(source) {
		t.Fatalf("finding = %#v", finding)
	}
}

func TestRemovedSemanticPolicySelectorsRejectStaleConfiguration(t *testing.T) {
	rules, err := defaultRules()
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
		"abstraction/do-not-force-variation-through-flags",
		"readability/name-things-by-their-purpose",
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

func TestRunWithoutProjectPoliciesPointsToInit(t *testing.T) {
	root := t.TempDir()
	runGit(t, root, "init", "-q")
	writeTestFile(t, root, "src/example.ts", "export {};\n")
	runGit(t, root, "add", ".")
	_, err := Run(context.Background(), root, []string{"--dry-run"}, io.Discard)
	if err == nil || !strings.Contains(err.Error(), "better-typescript semantic init") {
		t.Fatalf("err = %v, want init hint", err)
	}
}

func TestInitCopiesDefaultPoliciesAndKeepsEditedFiles(t *testing.T) {
	root := t.TempDir()
	edited := "---\nglobs:\n  - \"**/*.ts\"\n---\n# Edited\n\nKeep this.\n"
	writeTestFile(t, root, ".better-typescript/rules/readonly.md", edited)
	var output bytes.Buffer
	if code, err := Run(context.Background(), root, []string{"init"}, &output); err != nil || code != 0 {
		t.Fatalf("code = %d, err = %v", code, err)
	}
	if !strings.Contains(output.String(), "kept .better-typescript/rules/readonly.md\n") ||
		!strings.Contains(output.String(), "created .better-typescript/rules/effect/separate-service-interfaces-from-layer-construction.md\n") {
		t.Fatalf("output = %q", output.String())
	}
	content, err := os.ReadFile(filepath.Join(root, ".better-typescript/rules/readonly.md"))
	if err != nil || string(content) != edited {
		t.Fatalf("readonly.md = %q, err = %v", content, err)
	}
	rules, err := loadRules(root, defaultRulesDirectory)
	if err != nil {
		t.Fatal(err)
	}
	defaults, err := defaultRules()
	if err != nil {
		t.Fatal(err)
	}
	if len(rules) != len(defaults) {
		t.Fatalf("loaded %d policies, want %d", len(rules), len(defaults))
	}
}

func newSemanticTestRepository(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	runGit(t, root, "init", "-q")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test")
	writeTestFile(t, root, "src/example.ts", "export {};\n")
	installDefaultRules(t, root)
	runGit(t, root, "add", ".")
	runGit(t, root, "commit", "-qm", "initial")
	return root
}

// installDefaultRules opts root into the default policies without making them lint targets.
func installDefaultRules(t *testing.T, root string) {
	t.Helper()
	if err := initRules(root, defaultRulesDirectory, io.Discard); err != nil {
		t.Fatal(err)
	}
	writeTestFile(t, root, ".git/info/exclude", ".better-typescript/\n")
}

func defaultRules() ([]Rule, error) {
	sources, err := embeddedRuleSources()
	if err != nil {
		return nil, err
	}
	return parseRules(sources)
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
