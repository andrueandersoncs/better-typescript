package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"strings"
	"testing"
)

func TestReviewDoesNotFailSemanticRun(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	source := Source{Path: "src/args.ts", Text: "export const parseArgs = (args: string[]) => args.indexOf('--')\n"}
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id, question := range request.Questions {
			probability := 0.9
			if strings.Contains(question.Instructions, "Do the selected") {
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

func TestSemanticViolationLocatesEvidenceWithinCandidateSpan(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	prefix := strings.Repeat("// unrelated code\n", 95)
	source := prefix + "export const parseArgs = (args: string[]) => args.indexOf('--')\n"
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id, question := range request.Questions {
			if question.Type == "choice" {
				answers[id] = testRouteAnswer(request, "parseArgs")
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
	if len(report.Findings) != 1 || report.Findings[0].Classification != "violation" || len(report.Findings[0].CandidateRanges) != 1 {
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
		for id, question := range request.Questions {
			if question.Type == "choice" {
				route := testRouteAnswer(request, "interface Service", "const Service")
				if route.Choice == "both" {
					route.Choice = "left"
					route.Probabilities = map[string]float64{"left": 0.44, "right": 0.44, "both": 0.08, "neither": 0.04}
					route.Confidence = 0.4
				}
				answers[id] = route
				continue
			}
			text := request.State["file"]
			both := strings.Contains(text, "interface Service") && strings.Contains(text, "const Service")
			probability := 0.9
			if strings.Contains(question.Instructions, "Do the selected") && !both {
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
	if len(report.Findings) != 1 || report.Findings[0].Classification != "violation" || len(report.Findings[0].CandidateRanges) != 2 {
		t.Fatalf("findings = %#v", report.Findings)
	}
	first, second := report.Findings[0].CandidateRanges[0], report.Findings[0].CandidateRanges[1]
	if first.StartLine != 1 || second.EndLine != 97 || first.EndLine >= second.StartLine {
		t.Fatalf("evidence ranges = %#v", report.Findings[0].CandidateRanges)
	}
}

func TestSearchRejectsIncompleteChoiceDistribution(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id, question := range request.Questions {
			if question.Type == "choice" {
				answers[id] = answer{Type: "choice", Choice: "left", Probabilities: map[string]float64{"left": 0.9, "right": 0.1}}
			} else {
				answers[id] = answer{Type: "noul", Noul: 0.9}
			}
		}
		return evaluationResponse{Model: "jev-test", Answers: answers}, nil
	})
	_, err := evaluateSource(context.Background(), Source{Path: "src/args.ts", Text: strings.Repeat("// unrelated code\n", 95)}, []Rule{rule}, Options{Threshold: 0.7}, evaluate)
	if err == nil || !strings.Contains(err.Error(), "Choice") {
		t.Fatalf("incomplete Choice distribution: %v", err)
	}
}

func TestSearchAbstainsWhenNeitherBranchCanContribute(t *testing.T) {
	rule := testRule(t, "comment-evidence", "Explain the -- parsing invariant where it matters.")
	source := Source{Path: "src/args.ts", Text: strings.Repeat("// unrelated code\n", 95)}
	evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		answers := make(map[string]answer, len(request.Questions))
		for id, question := range request.Questions {
			if question.Type == "choice" {
				answers[id] = testRouteAnswer(request, "parseArgs")
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
