package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestReviewDoesNotFailSemanticRun(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	source := Source{Path: "src/args.ts", Text: "export const parseArgs = (args: string[]) => args.indexOf('--')\n"}
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			probability := 0.9
			if len(request.Questions) == 2 && !strings.HasSuffix(id, "_applies") {
				probability = 0.6
			}
			answers[id] = answer{Type: "noul", Noul: probability}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	report, err := evaluateSource(context.Background(), source, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Findings) != 1 || report.Findings[0].Classification != "review" {
		t.Fatalf("findings = %#v", report.Findings)
	}
	code, err := writeFindingReports(io.Discard, []FindingReport{report}, true)
	if err != nil || code != 0 {
		t.Fatalf("review exit code = %d, error = %v", code, err)
	}
}

func TestPathSpecificPolicyFindsOnlyTheMatchingFile(t *testing.T) {
	root := newSemanticTestRepository(t)
	source, err := os.ReadFile("testdata/evidence/debugger.ts")
	if err != nil {
		t.Fatal(err)
	}
	policy, err := os.ReadFile("testdata/evidence/path-specific-debugger.md")
	if err != nil {
		t.Fatal(err)
	}
	writeTestFile(t, root, ".better-typescript/rules/path-specific-debugger.md", string(policy))
	writeTestFile(t, root, "src/smoke.ts", string(source))
	writeTestFile(t, root, "src/other.ts", string(source))

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		var received evaluationRequest
		if err := json.NewDecoder(request.Body).Decode(&received); err != nil {
			t.Error(err)
			writer.WriteHeader(http.StatusBadRequest)
			return
		}
		probability := 0.02
		if received.State["path"] == "src/smoke.ts" && strings.Contains(received.State["file"], "debugger;") {
			probability = 0.98
		}
		answers := make(map[string]answer, len(received.Questions))
		for id := range received.Questions {
			answers[id] = answer{Type: "noul", Noul: probability}
		}
		if err := json.NewEncoder(writer).Encode(evaluationResponse{Model: "jev-test", Answers: answers}); err != nil {
			t.Error(err)
		}
	}))
	defer server.Close()
	t.Setenv("TYPESAFE_API_KEY", "test-key")
	t.Setenv("TYPESAFE_BASE_URL", server.URL)

	var output bytes.Buffer
	code, err := Run(context.Background(), root, []string{
		"--files", "src/smoke.ts,src/other.ts", "--rules", "path-specific-debugger", "--json",
	}, &output)
	if err != nil {
		t.Fatal(err)
	}
	var reports []FindingReport
	if err := json.Unmarshal(output.Bytes(), &reports); err != nil {
		t.Fatal(err)
	}
	if code != 1 || len(reports) != 2 ||
		reports[0].Source != "src/other.ts" || reports[0].Findings[0].Classification != "inconclusive" ||
		reports[1].Source != "src/smoke.ts" || reports[1].Findings[0].Classification != "violation" ||
		reports[1].Findings[0].EvidenceScope != "file" ||
		len(reports[1].Findings[0].CandidateRanges) != 1 || reports[1].Findings[0].CandidateRanges[0].StartLine != 1 {
	}
}

func TestSemanticViolationLocatesEvidenceWithinCandidateSpan(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	prefix := strings.Repeat("// unrelated code\n", 95)
	source := prefix + "export const parseArgs = (args: string[]) => args.indexOf('--')\n"
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			if strings.HasPrefix(id, "block_") {
				answers[id] = testEvidenceAnswer(request, id, "parseArgs")
				continue
			}
			value := 0.1
			if strings.Contains(request.State["file"], "parseArgs") {
				value = 0.9
			}
			answers[id] = answer{Type: "noul", Noul: value}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	report, err := evaluateSource(context.Background(), Source{Path: "src/args.ts", Text: source}, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Findings) != 1 || report.Findings[0].Classification != "violation" || len(report.Findings[0].CandidateRanges) != 1 || report.Findings[0].EvidenceScope != "localized" {
		t.Fatalf("findings = %#v", report.Findings)
	}
	range_ := report.Findings[0].CandidateRanges[0]
	if range_.StartLine > 96 || range_.EndLine < 96 || range_.EndLine-range_.StartLine > 20 {
		t.Fatalf("candidate lines %d-%d do not locate the violation on line 96", range_.StartLine, range_.EndLine)
	}
}

func TestDistantDeclarationsRemainTogetherInEvidenceSet(t *testing.T) {
	rule := testRule(t, "separate-service", "Do not give the service contract and its Layer implementation the same exported name.")
	source := "export interface Service { run(): void }\n" +
		strings.Repeat("// unrelated code\n", 95) +
		"export const Service = Layer.succeed(Service, { run() {} })\n"
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			if strings.HasPrefix(id, "block_") {
				answers[id] = testEvidenceAnswer(request, id, "interface Service", "const Service")
				continue
			}
			text := request.State["file"]
			both := strings.Contains(text, "interface Service") && strings.Contains(text, "const Service")
			probability := 0.9
			if len(request.Questions) == 2 && !strings.HasSuffix(id, "_applies") && !both {
				probability = 0.1
			}
			answers[id] = answer{Type: "noul", Noul: probability}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	report, err := evaluateSource(context.Background(), Source{Path: "src/service.ts", Text: source}, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Findings) != 1 || report.Findings[0].Classification != "violation" || len(report.Findings[0].CandidateRanges) != 2 || report.Findings[0].EvidenceScope != "localized" {
		t.Fatalf("findings = %#v", report.Findings)
	}
	first, second := report.Findings[0].CandidateRanges[0], report.Findings[0].CandidateRanges[1]
	if first.StartLine != 1 || second.EndLine != 97 || first.EndLine >= second.StartLine {
		t.Fatalf("evidence ranges = %#v", report.Findings[0].CandidateRanges)
	}
}

func TestEvidenceRejectsOmittedBlockAnswer(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			if id != "block_2" {
				answers[id] = answer{Type: "noul", Noul: 0.9}
			}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	_, err := evaluateSource(context.Background(), Source{Path: "src/args.ts", Text: strings.Repeat("// unrelated code\n", 95)}, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
	if err == nil || !strings.Contains(err.Error(), "evidence answer") {
		t.Fatalf("omitted block answer: %v", err)
	}
}

func TestEvidenceAbstainsWhenNoBlockCanContribute(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	source := Source{Path: "src/args.ts", Text: strings.Repeat("// unrelated code\n", 95)}
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			if strings.HasPrefix(id, "block_") {
				answers[id] = testEvidenceAnswer(request, id, "parseArgs")
			} else {
				answers[id] = answer{Type: "noul", Noul: 0.9}
			}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	report, err := evaluateSource(context.Background(), source, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Findings) != 1 || report.Findings[0].Classification != "inconclusive" || report.Findings[0].ViolationProbability != nil || report.Findings[0].Reason != "no evidence selected" {
		t.Fatalf("findings = %#v", report.Findings)
	}
}

func TestEmptySourceCannotSupplyLocalizedEvidence(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id := range request.Questions {
			answers[id] = answer{Type: "noul", Noul: 0.9}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	report, err := evaluateSource(context.Background(), Source{Path: "src/empty.ts"}, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Findings) != 1 || report.Findings[0].Classification != "inconclusive" || report.Findings[0].ViolationProbability != nil || report.Findings[0].Reason != "no evidence selected" {
		t.Fatalf("findings = %#v", report.Findings)
	}
}

func TestAllDryRunIncludesTrackedTypeScriptAlongsidePackageJSON(t *testing.T) {
	root := newSemanticTestRepository(t)
	writeTestFile(t, root, "package.json", `{"name":"example"}`)
	runGit(t, root, "add", "package.json")
	runGit(t, root, "commit", "-qm", "add package")
	var output bytes.Buffer
	code, err := Run(context.Background(), root, []string{"--all", "--dry-run", "--rules", "effect-errors"}, &output)
	if err != nil || code != 0 {
		t.Fatalf("dry-run code=%d err=%v", code, err)
	}
	var plan DryRunPlan
	if err := json.Unmarshal(output.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if len(plan.Files) != 2 || plan.Files[0].Path != "package.json" || plan.Files[1].Path != "src/example.ts" {
		t.Fatalf("selected files = %#v", plan.Files)
	}
}
