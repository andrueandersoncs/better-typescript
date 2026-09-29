package semanticlint

import (
	"context"
	"io"
	"strings"
	"testing"
)

func TestEvaluateSourceDoesNotReportViolationWhenPolicyDoesNotApply(t *testing.T) {
	for _, test := range []struct {
		name          string
		rule          string
		source        string
		applicability float64
	}{
		{"no service or Layer", "effect/separate-service-interfaces-from-layer-construction", "export const text = (input: string) => input.trim()\n", 0.1},
		{"pure calculation", "effect-errors", "export const verifyOutcome = (passed: boolean) => ({ passed })\n", 0.1},
		{"uncertain applicability", "effect-errors", "export const verifyOutcome = (passed: boolean) => ({ passed })\n", 0.69},
	} {
		t.Run(test.name, func(t *testing.T) {
			rules, err := loadRules(t.TempDir(), "")
			if err != nil {
				t.Fatal(err)
			}
			selected, err := selectSemanticRules(rules, []string{test.rule})
			if err != nil {
				t.Fatal(err)
			}
			seenApplicability := false
			evaluate := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
				answers := make(map[string]answer, len(request.Questions))
				for id := range request.Questions {
					probability := 0.9
					if strings.HasSuffix(id, "_applies") {
						seenApplicability = true
						probability = test.applicability
					}
					answers[id] = answer{Type: "noul", Noul: probability}
				}
				return evaluationResponse{Model: "jev-test", Answers: answers}, nil
			})
			report, err := evaluateSource(context.Background(), Source{Path: "src/example.ts", Text: test.source}, selected, Options{Threshold: 0.7}, evaluate)
			if err != nil {
				t.Fatal(err)
			}
			if !seenApplicability || len(report.Findings) != 1 || report.Findings[0].Classification != "inconclusive" || report.Findings[0].ViolationProbability != nil || report.Findings[0].ApplicabilityProbability == nil || *report.Findings[0].ApplicabilityProbability != test.applicability || report.Findings[0].Reason != "policy applicability not established" {
				t.Fatalf("applicability checked=%v, findings=%#v", seenApplicability, report.Findings)
			}
			exitCode, err := writeFindingReports(io.Discard, []FindingReport{report}, true)
			if err != nil || exitCode != 0 {
				t.Fatalf("exit code = %d, error = %v", exitCode, err)
			}
		})
	}
}
