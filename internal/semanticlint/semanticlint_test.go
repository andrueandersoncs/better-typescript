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

	appconfig "github.com/andrueandersoncs/better-typescript/internal/config"
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

func TestConfigureSemanticRulesAddsInclusionsToActiveRules(t *testing.T) {
	var rules []Rule
	for _, name := range []string{"a", "b"} {
		rule, err := parseRule("rules/"+name+".md", fmt.Sprintf("---\nglobs:\n  - \"**/*.ts\"\n---\n# %s\n\nPolicy %s.\n", name, name))
		if err != nil {
			t.Fatal(err)
		}
		rules = append(rules, rule)
	}
	configuration, err := appconfig.Parse([]byte(`{"commands":[
		{"mode":"semantic","type":"add_exclusions","files":"src/**","rules":["a"]},
		{"mode":"semantic","type":"add_inclusions","files":"src/main.ts","rules":["a"]}
	]}`))
	if err != nil {
		t.Fatal(err)
	}

	configured, err := configureSemanticRules(rules, configuration, []string{"src/main.ts", "src/other.ts"})
	if err != nil {
		t.Fatal(err)
	}
	byPath := make(map[string]Rule, len(configured))
	for _, rule := range configured {
		byPath[rule.Path] = rule
	}
	if !byPath["rules/a.md"].matchesDirectPath("src/main.ts") ||
		byPath["rules/a.md"].matchesDirectPath("src/other.ts") {
		t.Fatalf("rule a direct paths = %#v", byPath["rules/a.md"].directPaths)
	}
	if !byPath["rules/b.md"].matchesDirectPath("src/main.ts") ||
		!byPath["rules/b.md"].matchesDirectPath("src/other.ts") {
		t.Fatalf("rule b direct paths = %#v", byPath["rules/b.md"].directPaths)
	}
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

func TestRunSelectsCurrentFilesAndRulesWithoutChanges(t *testing.T) {
	root := newSemanticTestRepository(t)

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--files", "src/main.ts", "--rules", "no-debugger", "--dry-run"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	var documents []struct {
		Kind  string `json:"kind"`
		Rules []struct {
			Path string `json:"rulePath"`
		} `json:"rules"`
		DiffFiles []struct {
			Path   string `json:"path"`
			Status string `json:"status"`
			Hunks  []struct {
				Header string `json:"header"`
			} `json:"hunks"`
		} `json:"diffFiles"`
	}
	if err := json.Unmarshal(output.Bytes(), &documents); err != nil {
		t.Fatalf("decode dry-run output: %v\n%s", err, output.String())
	}
	if len(documents) != 1 || documents[0].Kind != "dry-run-plan" {
		t.Fatalf("unexpected dry-run documents: %s", output.String())
	}
	plan := documents[0]
	if len(plan.Rules) != 1 || !strings.HasSuffix(plan.Rules[0].Path, "/no-debugger.md") {
		t.Fatalf("selected rules = %#v", plan.Rules)
	}
	if len(plan.DiffFiles) != 1 || plan.DiffFiles[0].Path != "src/main.ts" || plan.DiffFiles[0].Status != "selected" {
		t.Fatalf("selected files = %#v", plan.DiffFiles)
	}
	if len(plan.DiffFiles[0].Hunks) != 1 || plan.DiffFiles[0].Hunks[0].Header != "Selected file" {
		t.Fatalf("selected file hunks = %#v", plan.DiffFiles[0].Hunks)
	}
}

func TestRunRoutesEmbeddedCompositionalityPolicies(t *testing.T) {
	root := newSemanticTestRepository(t)

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{
		"--files", "src/compositionality.ts",
		"--rules", "keep-library-imports-inert,give-request-bodies-and-streams-one-consumption-owner",
		"--dry-run",
	}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	var documents []struct {
		Kind  string `json:"kind"`
		Rules []struct {
			Path string `json:"rulePath"`
		} `json:"rules"`
		DiffFiles []struct {
			Path string `json:"path"`
		} `json:"diffFiles"`
	}
	if err := json.Unmarshal(output.Bytes(), &documents); err != nil {
		t.Fatalf("decode dry-run output: %v\n%s", err, output.String())
	}
	if len(documents) != 1 || documents[0].Kind != "dry-run-plan" {
		t.Fatalf("unexpected dry-run documents: %s", output.String())
	}
	var names []string
	for _, rule := range documents[0].Rules {
		names = append(names, strings.TrimSuffix(filepath.Base(rule.Path), ".md"))
	}
	slices.Sort(names)
	wantNames := []string{
		"give-request-bodies-and-streams-one-consumption-owner",
		"keep-library-imports-inert",
	}
	if !slices.Equal(names, wantNames) {
		t.Fatalf("selected rules = %#v, want %#v", names, wantNames)
	}
	if len(documents[0].DiffFiles) != 1 || documents[0].DiffFiles[0].Path != "src/compositionality.ts" {
		t.Fatalf("selected files = %#v", documents[0].DiffFiles)
	}
}

func TestRunAllSelectsEveryEligibleCurrentFile(t *testing.T) {
	root := newSemanticTestRepository(t)

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--all", "--rules", "no-debugger", "--dry-run"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	var documents []struct {
		DiffFiles []struct {
			Path string `json:"path"`
		} `json:"diffFiles"`
	}
	if err := json.Unmarshal(output.Bytes(), &documents); err != nil {
		t.Fatalf("decode dry-run output: %v\n%s", err, output.String())
	}
	var paths []string
	for _, file := range documents[0].DiffFiles {
		paths = append(paths, file.Path)
	}
	want := []string{".better-typescript/rules/no-debugger.md", "src/compositionality.ts", "src/main.ts"}
	if !slices.Equal(paths, want) {
		t.Fatalf("selected files = %#v, want %#v", paths, want)
	}
}

func TestRunAppliesSemanticCommandsWithoutRemovingEvidence(t *testing.T) {
	root := newSemanticTestRepository(t)
	if err := os.WriteFile(
		filepath.Join(root, "better-typescript.json"),
		[]byte(`{"commands":[{"mode":"semantic","type":"add_exclusions","files":"src/main.ts","rules":["no-debugger"]}]}`),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	snapshot, err := gitSnapshot(context.Background(), root, "")
	if err != nil {
		t.Fatal(err)
	}
	configuration, err := loadConfiguration(context.Background(), root, snapshot)
	if err != nil {
		t.Fatal(err)
	}
	snapshot, err = selectCurrentFiles(root, snapshot, nil, true)
	if err != nil {
		t.Fatal(err)
	}
	evidence, err := buildRepositoryEvidence(context.Background(), root, snapshot, "")
	if err != nil {
		t.Fatal(err)
	}
	foundEvidence := false
	for _, source := range evidence.Files {
		foundEvidence = foundEvidence || source.Path == "src/main.ts"
	}
	if !foundEvidence {
		t.Fatal("file without active semantic rules was removed from repository evidence")
	}
	rules, err := loadRules(root, ".better-typescript/rules")
	if err != nil {
		t.Fatal(err)
	}
	configured, err := configureSemanticRules(rules, configuration, evidence.ChangedPaths)
	if err != nil {
		t.Fatal(err)
	}
	if len(configured) == 0 {
		t.Fatal("semantic commands removed rules from unrelated files")
	}
	foundNoDebugger := false
	for _, rule := range configured {
		if strings.HasSuffix(rule.Path, "/no-debugger.md") {
			foundNoDebugger = true
			if rule.matchesDirectPath("src/main.ts") {
				t.Fatal("no-debugger remained active for src/main.ts")
			}
		}
	}
	if !foundNoDebugger {
		t.Fatal("no-debugger was removed from unrelated files")
	}

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--all", "--dry-run"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
}

func TestRunSelectsSemanticRulesPerFileFromConfiguration(t *testing.T) {
	root := newSemanticTestRepository(t)
	if err := os.WriteFile(
		filepath.Join(root, "better-typescript.json"),
		[]byte(`{"commands":[
			{"mode":"semantic","type":"add_exclusions","files":"src/**","rules":["no-debugger"]},
			{"mode":"semantic","type":"add_inclusions","files":"src/main.ts","rules":["no-debugger"]}
		]}`),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{
		"--files", "src/main.ts,src/compositionality.ts",
		"--dry-run",
	}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	var documents []struct {
		Kind  string `json:"kind"`
		Rules []struct {
			Path  string `json:"rulePath"`
			Route struct {
				Nodes []struct {
					Candidates []struct {
						Description string `json:"description"`
					} `json:"candidates"`
				} `json:"nodes"`
			} `json:"route"`
		} `json:"rules"`
		DiffFiles []struct {
			Path string `json:"path"`
		} `json:"diffFiles"`
	}
	if err := json.Unmarshal(output.Bytes(), &documents); err != nil {
		t.Fatal(err)
	}
	planIndex := -1
	for index, document := range documents {
		if document.Kind == "dry-run-plan" {
			planIndex = index
			break
		}
	}
	if planIndex < 0 {
		t.Fatalf("dry-run plan missing from %#v", documents)
	}
	plan := documents[planIndex]
	noDebuggerIndex := -1
	for index, rule := range plan.Rules {
		if strings.HasSuffix(rule.Path, "/no-debugger.md") {
			noDebuggerIndex = index
			break
		}
	}
	if noDebuggerIndex < 0 {
		t.Fatalf("configured rules omit no-debugger: %#v", plan.Rules)
	}
	var routeDescriptions string
	for _, node := range plan.Rules[noDebuggerIndex].Route.Nodes {
		for _, candidate := range node.Candidates {
			routeDescriptions += candidate.Description
		}
	}
	if !strings.Contains(routeDescriptions, "src/main.ts") || strings.Contains(routeDescriptions, "src/compositionality.ts") {
		t.Fatalf("route candidates = %q", routeDescriptions)
	}
	var diffPaths []string
	for _, file := range plan.DiffFiles {
		diffPaths = append(diffPaths, file.Path)
	}
	if !slices.Equal(diffPaths, []string{"src/compositionality.ts", "src/main.ts"}) {
		t.Fatalf("selected files = %#v", diffPaths)
	}
}

func TestRunValidatesSemanticCommandsUnlessRulesAreExplicit(t *testing.T) {
	root := newSemanticTestRepository(t)
	if err := os.WriteFile(
		filepath.Join(root, "better-typescript.json"),
		[]byte(`{"commands":[{"mode":"semantic","type":"add_inclusions","files":"src/**","rules":["missing"]}]}`),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	var output bytes.Buffer
	_, err := Run(context.Background(), root, []string{"--files", "src/main.ts", "--dry-run"}, &output)
	if err == nil || !strings.Contains(err.Error(), "unknown semantic rule: missing") {
		t.Fatalf("error = %v, want unknown semantic rule", err)
	}

	output.Reset()
	exitCode, err := Run(context.Background(), root, []string{
		"--files", "src/main.ts",
		"--rules", "no-debugger",
		"--dry-run",
	}, &output)
	if err != nil || exitCode != 0 {
		t.Fatalf("explicit rules = exit %d, error %v", exitCode, err)
	}
}

func TestParseOptionsSupportsRepeatedAndCommaSeparatedSelections(t *testing.T) {
	options, _, err := parseOptions([]string{
		"--files", "src/*.ts,test/*.ts",
		"--files", "scripts/*.ts",
		"--rules", "readonly,function-naming",
		"--rules", "avoid-repetition",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(options.FilePatterns, []string{"src/*.ts", "test/*.ts", "scripts/*.ts"}) {
		t.Fatalf("file patterns = %#v", options.FilePatterns)
	}
	if !slices.Equal(options.RuleNames, []string{"readonly", "function-naming", "avoid-repetition"}) {
		t.Fatalf("rule names = %#v", options.RuleNames)
	}
}

func TestParseOptionsRejectsMultipleTargetModes(t *testing.T) {
	for _, args := range [][]string{
		{"--all", "--files", "src/**"},
		{"--all", "--range", "main..HEAD"},
		{"--files", "src/**", "--range", "main..HEAD"},
	} {
		if _, _, err := parseOptions(args); err == nil {
			t.Errorf("parseOptions(%q) succeeded", args)
		}
	}
}

func TestRunRejectsUnknownFileAndRuleSelections(t *testing.T) {
	root := newSemanticTestRepository(t)
	cases := []struct {
		args    []string
		message string
	}{
		{args: []string{"--files", "missing/**", "--dry-run"}, message: "--files matched no eligible repository files"},
		{args: []string{"--all", "--rules", "missing", "--dry-run"}, message: "unknown semantic rule: missing"},
	}
	for _, test := range cases {
		var output bytes.Buffer
		if _, err := Run(context.Background(), root, test.args, &output); err == nil || !strings.Contains(err.Error(), test.message) {
			t.Errorf("Run(%q) error = %v, want %q", test.args, err, test.message)
		}
	}
}

func newSemanticTestRepository(t *testing.T) string {
	t.Helper()
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
	return root
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

func TestRunCommitRangeUsesEndpointConfiguration(t *testing.T) {
	root := newSemanticTestRepository(t)
	configPath := filepath.Join(root, "better-typescript.json")
	if err := os.WriteFile(configPath, []byte(`{"commands":[{"mode":"semantic","type":"add_exclusions","files":"src/main.ts","rules":["no-debugger"]}]}`), 0o600); err != nil {
		t.Fatal(err)
	}
	runGit(t, root, "add", ".")
	runGit(t, root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--quiet", "-m", "configure")
	if err := os.WriteFile(filepath.Join(root, "src", "main.ts"), []byte("export const changed = 1;\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	runGit(t, root, "add", ".")
	runGit(t, root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--quiet", "-m", "change semantic-excluded file")
	if err := os.WriteFile(configPath, []byte(`{"commands":[]}`), 0o600); err != nil {
		t.Fatal(err)
	}

	var output bytes.Buffer
	exitCode, err := Run(context.Background(), root, []string{"--range", "HEAD~1..HEAD", "--dry-run"}, &output)
	if err != nil {
		t.Fatal(err)
	}
	if exitCode != 0 || strings.Contains(output.String(), "/no-debugger.md") || !strings.Contains(output.String(), `"path":"src/main.ts"`) {
		t.Fatalf("range result = exit %d, output %q", exitCode, output.String())
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

func TestNoChangedSelectedEvidenceSkipsFinalJudgment(t *testing.T) {
	rule, err := parseRule("rules/example.md", "---\nglobs:\n  - \"**/*.ts\"\n---\n# Example\n\nCheck the repository.")
	if err != nil {
		t.Fatal(err)
	}
	rule.ID = "rule_1"
	rule.Metadata = RuleMetadata{Evaluator: "semantic", Scope: "repository"}
	repository := RepositoryEvidence{
		Paths:        []string{"src/main.ts", "src/peer.ts"},
		ChangedPaths: []string{"src/main.ts"},
		Files: []Source{
			{Path: "src/main.ts", Language: "ts", Text: "export const changed = 1;"},
			{Path: "src/peer.ts", Language: "ts", Text: "export const convention = 1;"},
		},
		DiffFiles: []DiffFile{{
			ID:     "file_1",
			Path:   "src/main.ts",
			Status: "modified",
			Hunks: []DiffHunk{{
				ID:           "file_1_hunk_1",
				Path:         "src/main.ts",
				NewStartLine: 1,
				NewLineCount: 1,
				Patch:        "+export const changed = 1;",
			}},
		}},
	}
	relevanceCalls := 0
	evaluator := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id, question := range request.Questions {
			if id == rule.ID {
				return evaluationResponse{}, fmt.Errorf("final judgment was evaluated")
			}
			instructions, ok := question.Instructions.(relevanceInstruction)
			if !ok {
				return evaluationResponse{}, fmt.Errorf("unexpected question %#v", question)
			}
			probability := 0.1
			if strings.Contains(instructions.CandidateID, "_peer_") {
				probability = 0.9
			}
			answers[id] = answer{Type: "noul", Noul: probability}
		}
		relevanceCalls++
		return evaluationResponse{Model: "test-model", Answers: answers, Usage: Usage{InputTokens: 3, OutputTokens: 1}}, nil
	})

	result, err := evaluateSemanticRule(context.Background(), rule, repository, repositoryRelations(repository), Options{Threshold: defaultThreshold, Model: defaultModel}, evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if relevanceCalls != 1 {
		t.Fatalf("relevance calls = %d, want 1", relevanceCalls)
	}
	if result.finding.Classification != "not_applicable" ||
		result.finding.Message != "No changed evidence candidate applies to this rule." ||
		result.finding.Evidence == nil || len(result.finding.Evidence) != 0 ||
		result.finding.Routing == nil || result.finding.Routing.SelectedEvidenceIDs == nil || len(result.finding.Routing.SelectedEvidenceIDs) != 0 {
		t.Fatalf("finding = %#v", result.finding)
	}
	if result.usage != (routingUsage{model: "test-model", inputTokens: 3, outputTokens: 1}) {
		t.Fatalf("usage = %#v", result.usage)
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

func TestEmbeddedTestingPoliciesAreSelectable(t *testing.T) {
	names := []string{
		"assert-the-intended-effect-failure-channel",
		"control-test-nondeterminism",
		"derive-expected-results-independently",
		"do-not-focus-or-silently-exclude-tests",
		"do-not-weaken-test-policy-silently",
		"execute-effects-created-by-tests",
		"execute-properties-through-the-test-runner",
		"generate-the-domain-the-property-claims",
		"isolate-browser-sessions-and-data",
		"isolate-state-for-each-generated-case",
		"keep-test-fixtures-type-checked",
		"keep-test-resources-hermetic",
		"own-asynchronous-test-work",
		"prevent-vacuous-property-sampling",
		"prevent-vacuous-test-success",
		"require-intentional-snapshot-changes",
		"state-the-law-property-tests-enforce",
		"use-stable-user-facing-browser-locators",
	}
	rules, err := loadRules(t.TempDir(), "")
	if err != nil {
		t.Fatal(err)
	}
	selected, err := selectSemanticRules(rules, names)
	if err != nil {
		t.Fatal(err)
	}
	if len(selected) != len(names) {
		t.Fatalf("selected testing policies = %d, want %d", len(selected), len(names))
	}
	for _, rule := range selected {
		if !strings.HasPrefix(rule.Path, "rules/testing-enforcement/") || rule.Metadata.Scope != "repository" {
			t.Fatalf("testing policy has unexpected metadata: %#v", rule)
		}
	}
}

func TestChoiceRoutingBoundsEscapedDescriptions(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example\n\nCheck the source.", Metadata: RuleMetadata{Scope: "source"}}
	options := make([]routeChoiceOption[string], maximumChoiceOptions-1)
	for index := range options {
		options[index] = routeChoiceOption[string]{
			id:          fmt.Sprintf("candidate_%d", index),
			description: strings.Repeat(`"quoted"\path`, maximumEvidenceSnippetBytes),
			value:       fmt.Sprintf("value_%d", index),
		}
	}
	evaluator := &selectingEvaluator{}
	if _, err := interpretRouteChoice(context.Background(), rule, buildRouteChoice("path", options), defaultModel, evaluator); err != nil {
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

func TestBuildRoutePlanDeclaresCompleteRecursiveTree(t *testing.T) {
	rule, err := parseRule("rules/example.md", "---\nglobs:\n  - \"src/**/*.ts\"\n  - \"tests/**/*.ts\"\n  - \"**/*.json\"\n---\n# Example\n\nCheck changed source.")
	if err != nil {
		t.Fatal(err)
	}

	const recursiveCandidateCount = (maximumChoiceOptions-1)*(maximumChoiceOptions-1) + 1
	diffFiles := make([]DiffFile, 0, recursiveCandidateCount+3)
	for fileIndex := range recursiveCandidateCount {
		hunkCount := 1
		if fileIndex == 0 {
			hunkCount = recursiveCandidateCount
		}
		hunks := make([]DiffHunk, hunkCount)
		for hunkIndex := range hunkCount {
			hunks[hunkIndex] = DiffHunk{
				ID:           fmt.Sprintf("hunk_%03d", hunkIndex),
				Path:         fmt.Sprintf("src/file_%03d.ts", fileIndex),
				NewStartLine: hunkIndex + 1,
				Header:       fmt.Sprintf("header %03d", hunkIndex),
				Patch:        fmt.Sprintf("+change %03d", hunkIndex),
			}
		}
		diffFiles = append(diffFiles, DiffFile{
			ID:     fmt.Sprintf("file_%03d", fileIndex),
			Path:   fmt.Sprintf("src/file_%03d.ts", fileIndex),
			Status: "modified",
			Hunks:  hunks,
		})
	}
	diffFiles = append(diffFiles,
		DiffFile{ID: "test_file", Path: "tests/example.test.ts", Status: "added"},
		DiffFile{ID: "config_file", Path: "tsconfig.json", Status: "modified"},
		DiffFile{ID: "documentation_file", Path: "docs/example.md", Status: "modified"},
	)

	plan := buildRoutePlan(rule, diffFiles)

	if plan.rule.Path != rule.Path {
		t.Fatalf("plan rule path = %q, want %q", plan.rule.Path, rule.Path)
	}
	if plan.domains.stage != "domain" {
		t.Fatalf("domain stage = %q", plan.domains.stage)
	}
	if len(plan.domains.options) != 2 || plan.domains.options[0].id != "domain_source" || plan.domains.options[1].id != "domain_tests" {
		t.Fatalf("domain options = %#v", plan.domains.options)
	}
	source := plan.domains.options[0]
	if source.members != nil {
		t.Fatal("source domain was unexpectedly bucketed")
	}
	if source.description != evidenceDomains["source"]+" Changed files: "+strings.Join(func() []string {
		paths := make([]string, recursiveCandidateCount)
		for index := range paths {
			paths[index] = fmt.Sprintf("src/file_%03d.ts", index)
		}
		return paths
	}(), ", ") {
		t.Fatalf("source description = %q", source.description)
	}

	paths := source.value.paths
	if paths.stage != "path" || len(paths.options) != 2 {
		t.Fatalf("path root = %#v", paths)
	}
	if paths.options[0].id != "bucket_1_1" || paths.options[1].id != "bucket_1_2" {
		t.Fatalf("path root bucket ids = %q, %q", paths.options[0].id, paths.options[1].id)
	}
	firstPathBucketLevel := paths.options[0].members
	if firstPathBucketLevel == nil || len(firstPathBucketLevel.options) != maximumChoiceOptions-1 || firstPathBucketLevel.options[0].id != "bucket_0_1" {
		t.Fatalf("first path bucket level = %#v", firstPathBucketLevel)
	}
	firstPathBucket := firstPathBucketLevel.options[0].members
	if firstPathBucket == nil || len(firstPathBucket.options) != maximumChoiceOptions-1 || firstPathBucket.options[0].id != "file_000" {
		t.Fatalf("first path leaf bucket = %#v", firstPathBucket)
	}
	if paths.options[0].description != strings.Join(func() []string {
		descriptions := make([]string, len(firstPathBucketLevel.options))
		for index, option := range firstPathBucketLevel.options {
			descriptions[index] = option.description
		}
		return descriptions
	}(), "; ") {
		t.Fatalf("top path bucket description = %q", paths.options[0].description)
	}

	pathCandidates := paths.candidates()
	if len(pathCandidates) != recursiveCandidateCount {
		t.Fatalf("path candidates = %d, want %d", len(pathCandidates), recursiveCandidateCount)
	}
	for index, candidate := range pathCandidates {
		wantID := fmt.Sprintf("file_%03d", index)
		if candidate.id != wantID || candidate.value.file.ID != wantID {
			t.Fatalf("path candidate %d = %#v", index, candidate)
		}
		hunkCandidates := candidate.value.hunks.candidates()
		wantHunks := 1
		if index == 0 {
			wantHunks = recursiveCandidateCount
		}
		if len(hunkCandidates) != wantHunks {
			t.Fatalf("hunks for %s = %d, want %d", wantID, len(hunkCandidates), wantHunks)
		}
		for _, hunk := range hunkCandidates {
			if hunk.value.file.ID != wantID || hunk.value.hunk.Path != candidate.value.file.Path {
				t.Fatalf("hunk does not retain its path candidate: %#v", hunk.value)
			}
		}
	}
	if pathCandidates[0].description != "modified src/file_000.ts; header 000; header 001; header 002; header 003" {
		t.Fatalf("first path description = %q", pathCandidates[0].description)
	}

	hunks := pathCandidates[0].value.hunks
	if hunks.stage != "hunk" || len(hunks.options) != 2 || hunks.options[0].id != "bucket_1_1" {
		t.Fatalf("hunk root = %#v", hunks)
	}
	firstHunkBucketLevel := hunks.options[0].members
	if firstHunkBucketLevel == nil || firstHunkBucketLevel.options[0].id != "bucket_0_1" {
		t.Fatalf("first hunk bucket level = %#v", firstHunkBucketLevel)
	}
	firstHunkBucket := firstHunkBucketLevel.options[0].members
	if firstHunkBucket == nil || firstHunkBucket.options[0].id != "hunk_000" {
		t.Fatalf("first hunk leaf bucket = %#v", firstHunkBucket)
	}
	if firstHunkBucket.options[0].description != "src/file_000.ts:1 header 000\n+change 000" {
		t.Fatalf("first hunk description = %q", firstHunkBucket.options[0].description)
	}

	testPaths := plan.domains.options[1].value.paths.candidates()
	if len(testPaths) != 1 || testPaths[0].id != "test_file" {
		t.Fatalf("test paths = %#v", testPaths)
	}
	synthetic := testPaths[0].value.hunks.candidates()
	if len(synthetic) != 1 || synthetic[0].id != "test_file_hunk_0" {
		t.Fatalf("synthetic hunks = %#v", synthetic)
	}
	wantSynthetic := syntheticHunk(diffFiles[recursiveCandidateCount])
	if synthetic[0].value.hunk != wantSynthetic {
		t.Fatalf("synthetic hunk = %#v, want %#v", synthetic[0].value.hunk, wantSynthetic)
	}
}

func TestRelevancePlanDeclaresEveryJudgmentBeforeEvaluation(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example\n\nCheck the source.", Metadata: RuleMetadata{Scope: "source"}}
	candidates := []Evidence{
		{ID: "oversized", Kind: "changed", Path: "src/oversized.ts", StartLine: 1, Snippet: strings.Repeat("x", maximumRequestBytes)},
		{Kind: "changed", Path: "src/second.ts", StartLine: 2, Snippet: strings.Repeat("y", maximumRequestBytes/2)},
		{ID: "third", Kind: "supporting", Path: "src/third.ts", StartLine: 3, Snippet: strings.Repeat("z", maximumRequestBytes/2)},
	}
	plan := buildRelevancePlan(rule, candidates)

	if plan.rule.ID != rule.ID || plan.rule.Path != rule.Path || plan.rule.Definition != rule.Definition || plan.rule.Metadata.Scope != rule.Metadata.Scope {
		t.Fatalf("plan rule = %#v, want %#v", plan.rule, rule)
	}
	if !slices.Equal(plan.candidates, candidates) {
		t.Fatalf("plan candidates = %#v, want %#v", plan.candidates, candidates)
	}
	wantQuestionIDs := []string{"evidence_1", "evidence_2", "evidence_3"}
	wantCandidateIDs := []string{"oversized", "src/second.ts:2", "third"}
	declared := make(map[string]relevanceJudgment, len(plan.judgments))
	for index, judgment := range plan.judgments {
		if judgment.candidateIndex != index || judgment.questionID != wantQuestionIDs[index] {
			t.Fatalf("judgment %d = %#v", index, judgment)
		}
		if judgment.question.Type != "noul" || !slices.Equal(judgment.question.CriteriaOrder, []string{"true", "false"}) {
			t.Fatalf("question %q = %#v", judgment.questionID, judgment.question)
		}
		instructions, ok := judgment.question.Instructions.(relevanceInstruction)
		if !ok ||
			instructions.Task != "Is this evidence candidate materially relevant to deciding whether the supplied rule is violated?" ||
			instructions.CandidateID != wantCandidateIDs[index] ||
			instructions.Rule.Source != rule.Path ||
			instructions.Rule.Definition != rule.Definition ||
			instructions.Rule.Scope != rule.Metadata.Scope {
			t.Fatalf("instructions %q = %#v", judgment.questionID, judgment.question.Instructions)
		}
		if judgment.question.Criteria["true"] != "The candidate contains facts needed to apply the rule or compare the change with its surrounding contract or convention." ||
			judgment.question.Criteria["false"] != "The candidate is incidental, merely nearby, or does not help decide the rule." {
			t.Fatalf("criteria %q = %#v", judgment.questionID, judgment.question.Criteria)
		}
		declared[judgment.questionID] = judgment
	}

	var evaluatorMu sync.Mutex
	evaluatorCalls := 0
	evaluator := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		evaluatorMu.Lock()
		defer evaluatorMu.Unlock()
		if evaluatorCalls == 0 && (len(plan.candidates) != len(candidates) || len(plan.judgments) != len(candidates)) {
			return evaluationResponse{}, fmt.Errorf("first evaluation began before the complete relevance plan existed")
		}
		evaluatorCalls++
		if len(request.Questions) != len(request.QuestionOrder) {
			return evaluationResponse{}, fmt.Errorf("physical request contains questions outside its declared order")
		}
		for questionID := range request.Questions {
			if _, ok := declared[questionID]; !ok {
				return evaluationResponse{}, fmt.Errorf("evaluation requested undeclared question %q", questionID)
			}
		}
		answers := make(map[string]answer, len(request.Questions))
		for _, questionID := range request.QuestionOrder {
			judgment, ok := declared[questionID]
			if !ok {
				return evaluationResponse{}, fmt.Errorf("evaluation requested undeclared question %q", questionID)
			}
			if request.Questions[questionID].Type != judgment.question.Type {
				return evaluationResponse{}, fmt.Errorf("evaluation changed declared question %q", questionID)
			}
			if questionID == "evidence_1" {
				return evaluationResponse{}, fmt.Errorf("oversized relevance question was evaluated")
			}
			probability := map[string]float64{"evidence_2": 0.6, "evidence_3": 0.8}[questionID]
			answers[questionID] = answer{Type: "noul", Noul: probability}
		}
		return evaluationResponse{Model: "test-model", Answers: answers, Usage: Usage{InputTokens: 3, OutputTokens: 1}}, nil
	})

	interpretation, err := interpretRelevancePlan(context.Background(), plan, defaultModel, evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if evaluatorCalls != 2 {
		t.Fatalf("physical evaluations = %d, want 2 partitioned requests", evaluatorCalls)
	}
	if len(interpretation.evidence) != 2 ||
		interpretation.evidence[0].Path != "src/second.ts" || interpretation.evidence[0].RelevanceProbability != 0.6 ||
		interpretation.evidence[1].Path != "src/third.ts" || interpretation.evidence[1].RelevanceProbability != 0.8 {
		t.Fatalf("interpreted relevance = %#v", interpretation.evidence)
	}
	if interpretation.usage != (routingUsage{model: "test-model", inputTokens: 6, outputTokens: 2}) {
		t.Fatalf("relevance usage = %#v", interpretation.usage)
	}

	missingAnswerPlan := buildRelevancePlan(rule, []Evidence{{ID: "missing", Path: "src/missing.ts"}})
	_, err = interpretRelevancePlan(context.Background(), missingAnswerPlan, defaultModel, evaluatorFunc(func(_ context.Context, _ evaluationRequest) (evaluationResponse, error) {
		return evaluationResponse{Answers: map[string]answer{}}, nil
	}))
	if err == nil || err.Error() != "TypeSafe returned no relevance answer for rule_1" {
		t.Fatalf("missing relevance answer error = %v", err)
	}
}

func TestRelevancePolicyUsesStableRankingThresholdAndLimit(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example"}
	evidence := []Evidence{
		{ID: "low", Kind: "diff-hunk", RelevanceProbability: 0.44},
		{ID: "b", Kind: "diff-hunk", RelevanceProbability: 0.7},
		{ID: "a", Kind: "diff-hunk", RelevanceProbability: 0.8},
		{ID: "c", Kind: "diff-hunk", RelevanceProbability: 0.7},
		{ID: "d", Kind: "diff-hunk", RelevanceProbability: 0.6},
		{ID: "e", Kind: "diff-hunk", RelevanceProbability: 0.5},
		{ID: "f", Kind: "diff-hunk", RelevanceProbability: minimumRelevanceProbability},
		{ID: "g", Kind: "diff-hunk", RelevanceProbability: minimumRelevanceProbability},
	}
	original := append([]Evidence(nil), evidence...)

	selected, decisions := applyRelevancePolicy(rule, evidence, defaultModel)

	if !slices.Equal(evidence, original) {
		t.Fatalf("policy mutated its evidence: %#v", evidence)
	}
	if selected.rule.ID != rule.ID || !selected.hasChanged {
		t.Fatalf("selected evidence stage = %#v", selected)
	}
	wantOrder := []string{"a", "b", "c", "d", "e", "f", "g", "low"}
	wantSelected := wantOrder[:maximumSelectedEvidence]
	if len(selected.evidence) != maximumSelectedEvidence {
		t.Fatalf("selected evidence = %d, want %d", len(selected.evidence), maximumSelectedEvidence)
	}
	for index, candidate := range wantSelected {
		if selected.evidence[index].ID != candidate {
			t.Fatalf("selected evidence %d = %q, want %q", index, selected.evidence[index].ID, candidate)
		}
	}
	if len(decisions) != len(wantOrder) {
		t.Fatalf("relevance decisions = %d, want %d", len(decisions), len(wantOrder))
	}
	for index, candidate := range wantOrder {
		if decisions[index].Candidate != candidate || decisions[index].Selected != (index < maximumSelectedEvidence) {
			t.Fatalf("relevance decision %d = %#v", index, decisions[index])
		}
	}
}

func TestSelectedEvidenceWithoutChangedCandidateIsNotApplicable(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Title: "Example", Definition: "# Example", Metadata: RuleMetadata{Evaluator: "semantic"}}
	scored := make([]Evidence, maximumSelectedEvidence)
	for index := range scored {
		scored[index] = Evidence{
			ID:                   fmt.Sprintf("support_%d", index),
			Kind:                 "repository-context",
			Path:                 fmt.Sprintf("support/%d.ts", index),
			Snippet:              strings.Repeat("x", maximumEvidenceSnippetBytes),
			RelevanceProbability: 0.9 - float64(index)/10,
		}
	}
	scored[len(scored)-1].ID = "changed"
	scored[len(scored)-1].Kind = "diff-hunk"

	selected, decisions := applyRelevancePolicy(rule, scored, defaultModel)

	if selected.hasChanged {
		t.Fatalf("selected evidence unexpectedly contains changed evidence: %#v", selected.evidence)
	}
	if len(selected.evidence) == 0 || len(selected.evidence) >= len(scored) {
		t.Fatalf("request-size fitting selected %d of %d evidence items", len(selected.evidence), len(scored))
	}
	for _, item := range selected.evidence {
		if isChangedEvidence(item) {
			t.Fatalf("selected evidence includes changed item %#v", item)
		}
	}
	if requestSize(finalJudgmentRequest(buildFinalJudgmentPlan(selected), defaultModel)) > maximumRequestBytes {
		t.Fatal("selected evidence does not fit the final request")
	}
	next := selectedEvidence{rule: rule, evidence: scored[:len(selected.evidence)+1]}
	if requestSize(finalJudgmentRequest(buildFinalJudgmentPlan(next), defaultModel)) <= maximumRequestBytes {
		t.Fatal("selected evidence policy did not retain the largest fitting prefix")
	}

	finding := composeNotApplicableFinding(selected, decisions)
	if finding.Classification != "not_applicable" ||
		finding.Message != "No changed evidence candidate applies to this rule." ||
		finding.Evidence == nil || len(finding.Evidence) != 0 ||
		finding.Routing == nil || finding.Routing.SelectedEvidenceIDs == nil || len(finding.Routing.SelectedEvidenceIDs) != 0 {
		t.Fatalf("not-applicable finding = %#v", finding)
	}
}

func TestFinalFindingCompositionPreservesClassificationMessagesAndSelectedIDs(t *testing.T) {
	rule := Rule{Path: "rules/example.md", Title: "Example", Metadata: RuleMetadata{Evaluator: "semantic"}}
	selected := selectedEvidence{
		rule: rule,
		evidence: []Evidence{
			{ID: "changed", Kind: "diff-hunk"},
			{ID: "support", Kind: "repository-context"},
		},
		hasChanged: true,
	}
	decisions := []RoutingDecision{{Stage: "relevance", Candidate: "changed", Probability: 0.9, Selected: true}}
	tests := []struct {
		name           string
		probability    float64
		classification string
		message        string
		evidenceCount  int
	}{
		{name: "violation", probability: 0.8, classification: "violation", message: "The candidate needs review against this rule.", evidenceCount: 2},
		{name: "review", probability: 0.5, classification: "review", message: "The candidate needs review against this rule.", evidenceCount: 2},
		{name: "pass", probability: 0.4, classification: "pass", message: "No concrete violation was found in this candidate.", evidenceCount: 0},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			finding := composeFinalFinding(selected, decisions, test.probability, defaultThreshold)
			if finding.RulePath != rule.Path ||
				finding.RuleTitle != rule.Title ||
				finding.Evaluator != rule.Metadata.Evaluator ||
				finding.Classification != test.classification ||
				finding.Message != test.message ||
				finding.ViolationProbability == nil || *finding.ViolationProbability != test.probability ||
				len(finding.Evidence) != test.evidenceCount ||
				finding.Routing == nil ||
				!slices.Equal(finding.Routing.Decisions, decisions) ||
				!slices.Equal(finding.Routing.SelectedEvidenceIDs, []string{"changed", "support"}) {
				t.Fatalf("finding = %#v", finding)
			}
		})
	}
}

func TestInterpretRoutePlanSkipsUnselectedDeclaredBranch(t *testing.T) {
	rule, err := parseRule("rules/example.md", "---\nglobs:\n  - \"**/*.ts\"\n---\n# Example\n\nCheck changed source.")
	if err != nil {
		t.Fatal(err)
	}
	rule.ID = "rule_1"
	rule.Metadata.Scope = "source"
	diffFiles := []DiffFile{
		{ID: "source_1", Path: "src/first.ts", Status: "modified"},
		{ID: "source_2", Path: "src/second.ts", Status: "modified"},
		{ID: "test_1", Path: "tests/first.test.ts", Status: "modified"},
		{ID: "test_2", Path: "tests/second.test.ts", Status: "modified"},
	}
	plan := buildRoutePlan(rule, diffFiles)
	if len(plan.domains.options) != 2 || len(plan.domains.options[1].value.paths.options) != 2 {
		t.Fatalf("plan does not declare the unselected tests branch: %#v", plan.domains)
	}

	var interpretedMu sync.Mutex
	var interpreted []choiceState
	evaluator := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		state := request.State.(choiceState)
		interpretedMu.Lock()
		interpreted = append(interpreted, state)
		interpretedMu.Unlock()
		selected := state.CandidateIDs[0]
		if state.Stage == "domain" {
			selected = "domain_source"
		}
		probabilities := make(map[string]float64, len(state.CandidateIDs)+1)
		for _, candidate := range state.CandidateIDs {
			probabilities[candidate] = 0
		}
		probabilities[selected] = 0.9
		probabilities["none"] = 0.1
		return evaluationResponse{
			Model:   "test-model",
			Answers: map[string]answer{"route": {Type: "choice", Choice: selected, Probabilities: probabilities}},
		}, nil
	})
	result, err := interpretRoutePlan(context.Background(), plan, defaultModel, evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.selected) != 1 || result.selected[0].value.file.ID != "source_1" {
		t.Fatalf("selected = %#v", result.selected)
	}
	if len(interpreted) != 2 {
		t.Fatalf("interpreted choices = %#v, want domain and selected source path only", interpreted)
	}
	if !slices.Equal(interpreted[1].CandidateIDs, []string{"source_1", "source_2"}) {
		t.Fatalf("interpreted unselected branch: %#v", interpreted)
	}
}

func TestChoiceRoutingRecursesThroughLargeBucketSets(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example\n\nCheck the source.", Metadata: RuleMetadata{Scope: "source"}}
	options := make([]routeChoiceOption[string], (maximumChoiceOptions-1)*(maximumChoiceOptions-1)+1)
	for index := range options {
		options[index] = routeChoiceOption[string]{
			id:          fmt.Sprintf("candidate_%03d", index),
			description: fmt.Sprintf("candidate %03d", index),
			value:       fmt.Sprintf("value_%03d", index),
		}
	}
	evaluator := &routingEvaluator{}
	result, err := interpretRouteChoice(context.Background(), rule, buildRouteChoice("path", options), "", evaluator)
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
	options := []routeChoiceOption[string]{
		{id: "first", description: "first", value: "first"},
		{id: "second", description: "second", value: "second"},
	}
	evaluator := &recordingEvaluator{}
	result, err := interpretRouteChoice(context.Background(), rule, buildRouteChoice("path", options), "", evaluator)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.selected) != 0 {
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

func TestFinalJudgmentPlanSeparatesChangedAndSupportingSelectedEvidence(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example", Metadata: RuleMetadata{Scope: "repository"}}
	selected, _ := applyRelevancePolicy(
		rule,
		[]Evidence{
			{ID: "support", Kind: "repository-context", Path: "package.json", Snippet: "{}", RelevanceProbability: 0.9},
			{ID: "changed", Kind: "diff-hunk", Path: "src/main.ts", Snippet: "+change", RelevanceProbability: 0.8},
			{ID: "unselected", Kind: "diff-hunk", Path: "src/other.ts", Snippet: "+other", RelevanceProbability: 0.44},
		},
		"",
	)
	if !selected.hasChanged || len(selected.evidence) != 2 {
		t.Fatalf("selected evidence = %#v", selected)
	}
	plan := buildFinalJudgmentPlan(selected)
	if plan.selected.rule.ID != rule.ID || plan.questionID != rule.ID || plan.question.Type != "noul" {
		t.Fatalf("final judgment plan = %#v", plan)
	}

	var request evaluationRequest
	interpretation, err := interpretFinalJudgmentPlan(context.Background(), plan, "", evaluatorFunc(func(_ context.Context, evaluated evaluationRequest) (evaluationResponse, error) {
		request = evaluated
		return evaluationResponse{
			Model:   "test-model",
			Answers: map[string]answer{"rule_1": {Type: "noul", Noul: 0.73}},
			Usage:   Usage{InputTokens: 4, OutputTokens: 1},
		}, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	if interpretation.probability != 0.73 || interpretation.usage != (routingUsage{model: "test-model", inputTokens: 4, outputTokens: 1}) {
		t.Fatalf("final judgment interpretation = %#v", interpretation)
	}

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
	if bytes.Contains(encoded, []byte(`"id":"unselected"`)) {
		t.Fatalf("request contains unselected evidence: %s", encoded)
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

func TestFinalJudgmentPlanRejectsMissingNoul(t *testing.T) {
	rule := Rule{ID: "rule_1", Path: "rules/example.md", Definition: "# Example"}
	selected := selectedEvidence{rule: rule, evidence: []Evidence{{ID: "changed", Kind: "diff-hunk", RelevanceProbability: 0.9}}, hasChanged: true}
	plan := buildFinalJudgmentPlan(selected)

	_, err := interpretFinalJudgmentPlan(context.Background(), plan, defaultModel, evaluatorFunc(func(_ context.Context, _ evaluationRequest) (evaluationResponse, error) {
		return evaluationResponse{Answers: map[string]answer{}}, nil
	}))
	if err == nil || err.Error() != "TypeSafe returned no rule answer for rule_1" {
		t.Fatalf("missing final Noul error = %v", err)
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
