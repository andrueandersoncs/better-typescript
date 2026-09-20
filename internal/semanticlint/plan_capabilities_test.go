package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"slices"
	"strings"
	"sync"
	"testing"
)

func capabilityRule(t *testing.T) Rule {
	t.Helper()
	rule, err := parseRule("rules/example.md", "---\nglobs:\n  - \"**/*.ts\"\n---\n# Example\n\nKeep the change simple.")
	if err != nil {
		t.Fatal(err)
	}
	rule.ID = "rule_1"
	return rule
}

func capabilityDiffFiles() []DiffFile {
	return []DiffFile{
		{ID: "source_a", Path: "src/a.ts", Status: "modified", Hunks: []DiffHunk{{ID: "hunk_a", Path: "src/a.ts", NewStartLine: 1, NewLineCount: 1, Header: "@@ -1 +1 @@", Patch: "+a"}}},
		{ID: "source_b", Path: "src/b.ts", Status: "modified", Hunks: []DiffHunk{{ID: "hunk_b", Path: "src/b.ts", NewStartLine: 1, NewLineCount: 1, Header: "@@ -1 +1 @@", Patch: "+b"}}},
		{ID: "test_a", Path: "tests/a.test.ts", Status: "modified", Hunks: []DiffHunk{{ID: "hunk_test_a", Path: "tests/a.test.ts", NewStartLine: 1, NewLineCount: 1, Header: "@@ -1 +1 @@", Patch: "+test a"}}},
		{ID: "test_b", Path: "tests/b.test.ts", Status: "modified", Hunks: []DiffHunk{{ID: "hunk_test_b", Path: "tests/b.test.ts", NewStartLine: 1, NewLineCount: 1, Header: "@@ -1 +1 @@", Patch: "+test b"}}},
	}
}

func TestDryRunInspectsCompleteRoutePlanAtHonestBoundaries(t *testing.T) {
	rule := capabilityRule(t)
	evidence := RepositoryEvidence{DiffFiles: capabilityDiffFiles()}

	first, err := dryRunPlan([]Rule{rule}, evidence, defaultModel)
	if err != nil {
		t.Fatal(err)
	}
	second, err := dryRunPlan([]Rule{rule}, evidence, defaultModel)
	if err != nil {
		t.Fatal(err)
	}
	firstJSON, _ := json.Marshal(first)
	secondJSON, _ := json.Marshal(second)
	if !bytes.Equal(firstJSON, secondJSON) {
		t.Fatalf("dry-run output is not deterministic:\n%s\n%s", firstJSON, secondJSON)
	}
	if len(first.Rules) != 1 || first.Rules[0].Relevance.Status != "unresolved" || first.Rules[0].Final.Status != "unresolved" {
		t.Fatalf("dry run crossed an unresolved stage: %#v", first.Rules)
	}
	nodes := first.Rules[0].Route.Nodes
	wantNodes := []string{
		"domain",
		"domain/source/path",
		"domain/source/path/source_a/hunk",
		"domain/source/path/source_b/hunk",
		"domain/tests/path",
		"domain/tests/path/test_a/hunk",
		"domain/tests/path/test_b/hunk",
	}
	gotNodes := make([]string, len(nodes))
	for index, node := range nodes {
		gotNodes[index] = node.NodeID
	}
	if !slices.Equal(gotNodes, wantNodes) {
		t.Fatalf("route nodes = %#v, want %#v", gotNodes, wantNodes)
	}
	if nodes[0].Disposition != "unresolved" || nodes[2].Disposition != "automatic" || nodes[2].AutomaticSelection != "hunk_a" {
		t.Fatalf("route dispositions = %#v", nodes)
	}
	if first.Cost.DeclaredQuestions != 3 || first.Cost.MaximumCalls != 3 || first.Cost.MaximumBytes == 0 || first.Cost.PricingStatus == "" {
		t.Fatalf("route estimate = %#v", first.Cost)
	}
}

func TestRelevancePlanInspectionIncludesEveryDeclarationAndPartition(t *testing.T) {
	rule := capabilityRule(t)
	plan := buildRelevancePlan(rule, []Evidence{
		{ID: "oversized", Kind: "diff-hunk", Path: "src/oversized.ts", Snippet: strings.Repeat("x", maximumRequestBytes)},
		{ID: "second", Kind: "diff-hunk", Path: "src/second.ts", Snippet: strings.Repeat("y", maximumRequestBytes/2)},
		{ID: "third", Kind: "repository-context", Path: "src/third.ts", Snippet: strings.Repeat("z", maximumRequestBytes/2)},
	})
	first, err := inspectRelevancePlan(plan, defaultModel)
	if err != nil {
		t.Fatal(err)
	}
	second, err := inspectRelevancePlan(plan, defaultModel)
	if err != nil {
		t.Fatal(err)
	}
	firstJSON, _ := json.Marshal(first)
	secondJSON, _ := json.Marshal(second)
	if !bytes.Equal(firstJSON, secondJSON) {
		t.Fatalf("relevance inspection is not deterministic:\n%s\n%s", firstJSON, secondJSON)
	}
	if len(first.Candidates) != 3 || first.Candidates[0].Disposition != "dropped_too_large" {
		t.Fatalf("relevance candidates = %#v", first.Candidates)
	}
	for _, candidate := range first.Candidates[1:] {
		if candidate.Disposition != "declared" || candidate.Partition == 0 || candidate.QuestionType != "noul" || candidate.DeclarationHash == "" {
			t.Fatalf("declared relevance candidate = %#v", candidate)
		}
	}
	if len(first.Partitions) != 2 || first.Cost.MinimumCalls != 2 || first.Cost.MaximumCalls != 2 || !first.Cost.Exact {
		t.Fatalf("relevance partitions/cost = %#v / %#v", first.Partitions, first.Cost)
	}
}

func TestConcretePlanValidatorsRejectEveryDeclaredInvariant(t *testing.T) {
	rule := capabilityRule(t)
	validRoute := func() routePlan { return buildRoutePlan(rule, capabilityDiffFiles()) }
	routeCases := []struct {
		name   string
		mutate func(*routePlan)
	}{
		{"stage", func(plan *routePlan) { plan.domains.stage = "wrong" }},
		{"duplicate candidate", func(plan *routePlan) { plan.domains.options[1].id = plan.domains.options[0].id }},
		{"bucket limit", func(plan *routePlan) {
			plan.domains.options = append(plan.domains.options, make([]routeChoiceOption[routeDomain], maximumChoiceOptions)...)
		}},
		{"bucket shape", func(plan *routePlan) { plan.domains.options[0].id = "bucket_invalid" }},
		{"path parent", func(plan *routePlan) {
			plan.domains.options[0].value.paths.options[0].value.file.Path = "tests/wrong.ts"
		}},
		{"hunk parent", func(plan *routePlan) {
			plan.domains.options[0].value.paths.options[0].value.hunks.options[0].value.hunk.Path = "src/wrong.ts"
		}},
	}
	for _, test := range routeCases {
		t.Run("route "+test.name, func(t *testing.T) {
			plan := validRoute()
			test.mutate(&plan)
			evaluator := &recordingEvaluator{}
			if _, err := interpretRoutePlan(context.Background(), plan, defaultModel, evaluator); err == nil || !strings.Contains(err.Error(), "invalid route plan for rule rule_1") {
				t.Fatalf("validation error = %v", err)
			}
			if evaluator.calls != 0 {
				t.Fatalf("evaluator calls = %d, want 0", evaluator.calls)
			}
		})
	}

	validRelevance := func() relevancePlan {
		return buildRelevancePlan(rule, []Evidence{{ID: "a", Kind: "diff-hunk", Path: "src/a.ts"}, {ID: "b", Kind: "diff-hunk", Path: "src/b.ts"}})
	}
	relevanceCases := []struct {
		name   string
		mutate func(*relevancePlan)
	}{
		{"count", func(plan *relevancePlan) { plan.judgments = plan.judgments[:1] }},
		{"bounds", func(plan *relevancePlan) { plan.judgments[0].candidateIndex = 3 }},
		{"order", func(plan *relevancePlan) { plan.judgments[0].candidateIndex, plan.judgments[1].candidateIndex = 1, 0 }},
		{"duplicate question", func(plan *relevancePlan) { plan.judgments[1].questionID = plan.judgments[0].questionID }},
		{"question type", func(plan *relevancePlan) { plan.judgments[0].question.Type = "choice" }},
	}
	for _, test := range relevanceCases {
		t.Run("relevance "+test.name, func(t *testing.T) {
			plan := validRelevance()
			test.mutate(&plan)
			evaluator := &recordingEvaluator{}
			if _, err := interpretRelevancePlan(context.Background(), plan, defaultModel, evaluator); err == nil || !strings.Contains(err.Error(), "invalid relevance plan for rule rule_1") {
				t.Fatalf("validation error = %v", err)
			}
			if evaluator.calls != 0 {
				t.Fatalf("evaluator calls = %d, want 0", evaluator.calls)
			}
		})
	}

	selectedCases := []struct {
		name     string
		selected selectedEvidence
	}{
		{"threshold", selectedEvidence{rule: rule, evidence: []Evidence{{ID: "a", Kind: "diff-hunk", RelevanceProbability: 0.1}}, hasChanged: true}},
		{"order", selectedEvidence{rule: rule, evidence: []Evidence{{ID: "a", Kind: "diff-hunk", RelevanceProbability: 0.6}, {ID: "b", Kind: "diff-hunk", RelevanceProbability: 0.9}}, hasChanged: true}},
		{"limit", selectedEvidence{rule: rule, evidence: makeSelectedEvidence(maximumSelectedEvidence + 1), hasChanged: true}},
		{"hasChanged", selectedEvidence{rule: rule, evidence: []Evidence{{ID: "a", Kind: "diff-hunk", RelevanceProbability: 0.9}}, hasChanged: false}},
		{"request size", selectedEvidence{rule: rule, evidence: []Evidence{{ID: "a", Kind: "diff-hunk", Snippet: strings.Repeat("x", maximumRequestBytes), RelevanceProbability: 0.9}}, hasChanged: true}},
	}
	for _, test := range selectedCases {
		t.Run("selected "+test.name, func(t *testing.T) {
			if err := validateSelectedEvidence(test.selected, defaultModel); err == nil || !strings.Contains(err.Error(), "invalid selected-evidence plan for rule rule_1") {
				t.Fatalf("validation error = %v", err)
			}
		})
	}

	validSelected := selectedEvidence{rule: rule, evidence: []Evidence{{ID: "a", Kind: "diff-hunk", RelevanceProbability: 0.9}}, hasChanged: true}
	finalCases := []struct {
		name   string
		mutate func(*finalJudgmentPlan)
	}{
		{"changed evidence", func(plan *finalJudgmentPlan) { plan.selected.hasChanged = false }},
		{"question id", func(plan *finalJudgmentPlan) { plan.questionID = "wrong" }},
		{"question type", func(plan *finalJudgmentPlan) { plan.question.Type = "choice" }},
	}
	for _, test := range finalCases {
		t.Run("final "+test.name, func(t *testing.T) {
			plan := buildFinalJudgmentPlan(validSelected)
			test.mutate(&plan)
			evaluator := &recordingEvaluator{}
			if _, err := interpretFinalJudgmentPlan(context.Background(), plan, defaultModel, evaluator); err == nil {
				t.Fatal("malformed final plan passed validation")
			}
			if evaluator.calls != 0 {
				t.Fatalf("evaluator calls = %d, want 0", evaluator.calls)
			}
		})
	}

	if err := validateRoutePlan(validRoute()); err != nil {
		t.Fatalf("constructor route plan: %v", err)
	}
	if err := validateRelevancePlan(validRelevance()); err != nil {
		t.Fatalf("constructor relevance plan: %v", err)
	}
	if err := validateSelectedEvidence(validSelected, defaultModel); err != nil {
		t.Fatalf("constructor selected evidence: %v", err)
	}
	if err := validateFinalJudgmentPlan(buildFinalJudgmentPlan(validSelected)); err != nil {
		t.Fatalf("constructor final plan: %v", err)
	}
}

func makeSelectedEvidence(count int) []Evidence {
	result := make([]Evidence, count)
	for index := range result {
		result[index] = Evidence{ID: fmt.Sprintf("evidence_%d", index), Kind: "diff-hunk", RelevanceProbability: 0.9 - float64(index)/100}
	}
	return result
}

type pipelineFixture struct {
	Route     planFixture `json:"route"`
	Relevance planFixture `json:"relevance"`
	Final     planFixture `json:"final"`
}

func loadPipelineFixture(t *testing.T) pipelineFixture {
	t.Helper()
	encoded, err := os.ReadFile("testdata/fixtures/full-pipeline.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture pipelineFixture
	if err := json.Unmarshal(encoded, &fixture); err != nil {
		t.Fatal(err)
	}
	return fixture
}

func runFixturePipeline(t *testing.T, fixture pipelineFixture) (Finding, []TraceEvent) {
	t.Helper()
	finding, trace, err := runFixturePipelineResult(fixture)
	if err != nil {
		t.Fatal(err)
	}
	return finding, trace
}

func runFixturePipelineResult(fixture pipelineFixture) (Finding, []TraceEvent, error) {
	rule, err := parseRule("rules/example.md", "---\nglobs:\n  - \"**/*.ts\"\n---\n# Example\n\nKeep the change simple.")
	if err != nil {
		return Finding{}, nil, err
	}
	rule.ID = "rule_1"
	route, err := interpretRouteFixture(context.Background(), buildRoutePlan(rule, capabilityDiffFiles()), defaultModel, fixture.Route, true)
	if err != nil {
		return Finding{}, nil, err
	}
	if len(route.selected) != 1 || route.selected[0].value.hunk.ID != "hunk_a" {
		return Finding{}, nil, fmt.Errorf("fixture selected unexpected route: %#v", route.selected)
	}
	candidate := Evidence{ID: "hunk_a", Kind: "diff-hunk", Path: "src/a.ts", Snippet: "+a"}
	relevance, err := interpretRelevanceFixture(context.Background(), buildRelevancePlan(rule, []Evidence{candidate}), defaultModel, fixture.Relevance, true)
	if err != nil {
		return Finding{}, nil, err
	}
	selected, relevanceDecisions := applyRelevancePolicy(rule, relevance.evidence, defaultModel)
	relevance.provenance = annotateRelevanceProvenance(relevance.provenance, selected, route)
	final, err := interpretFinalFixture(context.Background(), buildFinalJudgmentPlan(selected), defaultModel, fixture.Final, true)
	if err != nil {
		return Finding{}, nil, err
	}
	final.provenance[0].Threshold = probabilityPointer(defaultThreshold)
	records := append(append(append([]QuestionProvenance{}, route.provenance...), relevance.provenance...), final.provenance...)
	finding := composeFinalFinding(selected, append(route.decisions, relevanceDecisions...), final.probability, defaultThreshold)
	finding.Provenance = records
	return finding, executionTrace(rule.ID, records, finding.Classification), nil
}

func TestFixtureInterpretersProduceDeterministicLineageAndRejectStaleData(t *testing.T) {
	fixture := loadPipelineFixture(t)
	firstFinding, firstTrace := runFixturePipeline(t, fixture)
	secondFinding, secondTrace := runFixturePipeline(t, fixture)
	firstJSON, _ := json.Marshal(struct {
		Finding Finding      `json:"finding"`
		Trace   []TraceEvent `json:"trace"`
	}{firstFinding, firstTrace})
	secondJSON, _ := json.Marshal(struct {
		Finding Finding      `json:"finding"`
		Trace   []TraceEvent `json:"trace"`
	}{secondFinding, secondTrace})
	if !bytes.Equal(firstJSON, secondJSON) {
		t.Fatalf("fixture execution differs:\n%s\n%s", firstJSON, secondJSON)
	}
	if firstFinding.Classification != "violation" || len(firstFinding.Provenance) == 0 {
		t.Fatalf("fixture finding = %#v", firstFinding)
	}
	selectedEvidence := firstFinding.Routing.SelectedEvidenceIDs
	for _, evidenceID := range selectedEvidence {
		found := false
		for _, record := range firstFinding.Provenance {
			if record.Stage == "relevance" && record.EvidenceID == evidenceID && record.RouteLeafID == "hunk_a" && record.EvidenceHash != "" && record.Decision == "selected" {
				found = true
			}
		}
		if !found {
			t.Fatalf("selected evidence %q lacks relevance and route lineage: %#v", evidenceID, firstFinding.Provenance)
		}
	}
	final := firstFinding.Provenance[len(firstFinding.Provenance)-1]
	if final.Stage != "final" || !slices.Equal(final.SelectedEvidenceIDs, selectedEvidence) || final.Probability == nil || *final.Probability != 0.8 {
		t.Fatalf("final lineage = %#v", final)
	}
	encoded, _ := json.Marshal(firstFinding.Provenance)
	if bytes.Contains(encoded, []byte(`"snippet"`)) || bytes.Contains(encoded, []byte(`+a`)) {
		t.Fatalf("provenance embeds source evidence: %s", encoded)
	}

	stale := loadPipelineFixture(t)
	stale.Route.Answers["rule_1/path/domain/tests/path/route"] = answer{Type: "choice", Choice: "test_a", Probabilities: map[string]float64{"test_a": 0.8, "test_b": 0.1, "none": 0.1}}
	_, err := interpretRouteFixture(context.Background(), buildRoutePlan(capabilityRule(t), capabilityDiffFiles()), defaultModel, stale.Route, true)
	if err == nil || err.Error() != "fixture route rule_1/path/domain/tests/path/route: answer was not used" {
		t.Fatalf("stale fixture error = %v", err)
	}

	wrong := loadPipelineFixture(t)
	wrong.Relevance.Answers["rule_1/relevance/relevance/evidence_1"] = answer{Type: "choice", Choice: "x", Probabilities: map[string]float64{"x": 1}}
	_, err = interpretRelevanceFixture(context.Background(), buildRelevancePlan(capabilityRule(t), []Evidence{{ID: "hunk_a"}}), defaultModel, wrong.Relevance, true)
	wantWrongType := `fixture relevance rule_1/relevance/relevance/evidence_1: answer type "choice" does not match "noul"`
	if err == nil || err.Error() != wantWrongType {
		t.Fatalf("wrong fixture type error = %v", err)
	}

	missing := loadPipelineFixture(t)
	delete(missing.Route.Answers, "rule_1/path/domain/source/path/route")
	_, err = interpretRouteFixture(context.Background(), buildRoutePlan(capabilityRule(t), capabilityDiffFiles()), defaultModel, missing.Route, true)
	if err == nil || err.Error() != "fixture route rule_1/path/domain/source/path/route: answer is missing" {
		t.Fatalf("missing fixture answer error = %v", err)
	}

	invalid := loadPipelineFixture(t)
	invalid.Relevance.Answers["rule_1/relevance/relevance/evidence_1"] = answer{Type: "noul", Noul: math.NaN()}
	_, err = interpretRelevanceFixture(context.Background(), buildRelevancePlan(capabilityRule(t), []Evidence{{ID: "hunk_a"}}), defaultModel, invalid.Relevance, true)
	if err == nil || err.Error() != "fixture relevance rule_1/relevance/relevance/evidence_1: Noul probability is invalid" {
		t.Fatalf("invalid fixture probability error = %v", err)
	}
}

func TestCanonicalTraceIsStableAcrossConcurrentFixtureRuns(t *testing.T) {
	fixture := loadPipelineFixture(t)
	const runs = 8
	outputs := make([][]byte, runs)
	errs := make([]error, runs)
	var workers sync.WaitGroup
	for index := range runs {
		workers.Add(1)
		go func() {
			defer workers.Done()
			finding, trace, err := runFixturePipelineResult(fixture)
			if err != nil {
				errs[index] = err
				return
			}
			outputs[index], errs[index] = json.Marshal(struct {
				Finding Finding      `json:"finding"`
				Trace   []TraceEvent `json:"trace"`
			}{finding, trace})
		}()
	}
	workers.Wait()
	for _, err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	for index := 1; index < len(outputs); index++ {
		if !bytes.Equal(outputs[0], outputs[index]) {
			t.Fatalf("trace %d differs:\n%s\n%s", index, outputs[0], outputs[index])
		}
	}
	answers := make(map[string]answer)
	for key, value := range fixture.Route.Answers {
		answers[key] = value
	}
	for key, value := range fixture.Relevance.Answers {
		answers[key] = value
	}
	for key, value := range fixture.Final.Answers {
		answers[key] = value
	}
	declared := make([]string, 0, len(answers))
	for key := range answers {
		declared = append(declared, key)
	}
	run := func(trace bool) ruleResult {
		t.Helper()
		evaluator, err := newFixtureEvaluator("pipeline", planFixture{Answers: answers, Model: "fixture-model"}, declared)
		if err != nil {
			t.Fatal(err)
		}
		result, err := evaluateSemanticRule(
			context.Background(),
			capabilityRule(t),
			RepositoryEvidence{DiffFiles: capabilityDiffFiles()},
			map[string][]relation{},
			Options{Threshold: defaultThreshold, Model: defaultModel, Trace: trace},
			evaluator,
		)
		if err != nil {
			t.Fatal(err)
		}
		return result
	}
	withoutTrace := run(false)
	withTrace := run(true)
	withoutFinding, _ := json.Marshal(withoutTrace.finding)
	withFinding, _ := json.Marshal(withTrace.finding)
	withoutEvents, _ := json.Marshal(withoutTrace.trace)
	withEvents, _ := json.Marshal(withTrace.trace)
	if !bytes.Equal(withoutFinding, withFinding) || !bytes.Equal(withoutEvents, withEvents) {
		t.Fatal("enabling trace collection changed semantic execution")
	}
}

type countingEvaluator struct {
	mu      sync.Mutex
	calls   int
	bytes   int
	answers map[string]answer
	errors  map[string]error
}

func (evaluator *countingEvaluator) Evaluate(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
	nodeID := request.Scope.NodeID
	evaluator.mu.Lock()
	evaluator.calls++
	evaluator.bytes += requestSize(request)
	err := evaluator.errors[nodeID]
	evaluator.mu.Unlock()
	if err != nil {
		return evaluationResponse{}, err
	}
	value, ok := evaluator.answers[nodeID]
	if !ok {
		return evaluationResponse{}, fmt.Errorf("missing recorded answer for %s", nodeID)
	}
	return evaluationResponse{Model: "recorded", Answers: map[string]answer{"route": value}, Usage: Usage{InputTokens: 1, OutputTokens: 1}, Partition: evaluationHash(request)}, nil
}

func routeAnswers() map[string]answer {
	return map[string]answer{
		"domain":             {Type: "choice", Choice: "domain_source", Probabilities: map[string]float64{"domain_source": 0.8, "domain_tests": 0.1, "none": 0.1}},
		"domain/source/path": {Type: "choice", Choice: "source_a", Probabilities: map[string]float64{"source_a": 0.8, "source_b": 0.1, "none": 0.1}},
		"domain/tests/path":  {Type: "choice", Choice: "test_a", Probabilities: map[string]float64{"test_a": 0.8, "test_b": 0.1, "none": 0.1}},
	}
}

func TestPlanCostEstimatesBoundAndMatchRecordedExecution(t *testing.T) {
	rule := capabilityRule(t)
	routePlan := buildRoutePlan(rule, capabilityDiffFiles())
	routeCost := inspectRoutePlan(routePlan, defaultModel).Cost
	routeEvaluator := &countingEvaluator{answers: routeAnswers()}
	route, err := interpretRoutePlan(context.Background(), routePlan, defaultModel, routeEvaluator)
	if err != nil {
		t.Fatal(err)
	}
	if routeEvaluator.calls < routeCost.MinimumCalls || routeEvaluator.calls > routeCost.MaximumCalls || routeEvaluator.bytes < routeCost.MinimumBytes || routeEvaluator.bytes > routeCost.MaximumBytes {
		t.Fatalf("route actual calls/bytes %d/%d outside %#v", routeEvaluator.calls, routeEvaluator.bytes, routeCost)
	}

	candidate := Evidence{ID: route.selected[0].value.hunk.ID, Kind: "diff-hunk", Path: route.selected[0].value.file.Path, Snippet: "+a"}
	relevancePlan := buildRelevancePlan(rule, []Evidence{candidate})
	relevanceCost := estimateRelevancePlan(relevancePlan, defaultModel)
	calls, requestBytes := 0, 0
	relevanceEvaluator := evaluatorFunc(func(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
		calls++
		requestBytes += requestSize(request)
		return evaluationResponse{Model: "recorded", Answers: map[string]answer{"evidence_1": {Type: "noul", Noul: 0.9}}}, nil
	})
	relevance, err := interpretRelevancePlan(context.Background(), relevancePlan, defaultModel, relevanceEvaluator)
	if err != nil {
		t.Fatal(err)
	}
	if calls != relevanceCost.MinimumCalls || calls != relevanceCost.MaximumCalls || requestBytes != relevanceCost.MinimumBytes || requestBytes != relevanceCost.MaximumBytes {
		t.Fatalf("relevance actual calls/bytes %d/%d != %#v", calls, requestBytes, relevanceCost)
	}
	selected, _ := applyRelevancePolicy(rule, relevance.evidence, defaultModel)
	finalPlan := buildFinalJudgmentPlan(selected)
	finalCost := estimateFinalPlan(finalPlan, defaultModel)
	if finalCost.MinimumCalls != 1 || finalCost.MaximumCalls != 1 || finalCost.MinimumBytes != requestSize(finalJudgmentRequest(finalPlan, defaultModel)) || finalCost.MonetaryCost != nil {
		t.Fatalf("final estimate = %#v", finalCost)
	}
}

func TestSpeculativeRoutingMatchesSelectedOnlyAndContainsDiscardedWork(t *testing.T) {
	plan := buildRoutePlan(capabilityRule(t), capabilityDiffFiles())
	selectedEvaluator := &countingEvaluator{answers: routeAnswers()}
	selected, err := interpretRoutePlan(context.Background(), plan, defaultModel, selectedEvaluator)
	if err != nil {
		t.Fatal(err)
	}
	speculativeEvaluator := &countingEvaluator{answers: routeAnswers()}
	speculative, err := interpretRoutePlanSpeculative(context.Background(), plan, defaultModel, speculativeEvaluator)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(selected.decisions, speculative.decisions) || len(selected.selected) != len(speculative.selected) || selected.selected[0].value.hunk.ID != speculative.selected[0].value.hunk.ID {
		t.Fatalf("selected-only = %#v, speculative = %#v", selected, speculative)
	}
	if speculative.usage.inputTokens <= selected.usage.inputTokens || speculative.usage.outputTokens <= selected.usage.outputTokens {
		t.Fatalf("speculative usage %#v does not include discarded work beyond %#v", speculative.usage, selected.usage)
	}

	discardedError := &countingEvaluator{answers: routeAnswers(), errors: map[string]error{"domain/tests/path": errors.New("discarded failure")}}
	if _, err := interpretRoutePlanSpeculative(context.Background(), plan, defaultModel, discardedError); err != nil {
		t.Fatalf("discarded branch error failed selected execution: %v", err)
	}
	selectedError := &countingEvaluator{answers: routeAnswers(), errors: map[string]error{"domain/source/path": errors.New("selected failure")}}
	_, selectedOnlyErr := interpretRoutePlan(context.Background(), plan, defaultModel, selectedError)
	_, speculativeErr := interpretRoutePlanSpeculative(context.Background(), plan, defaultModel, selectedError)
	if selectedOnlyErr == nil || speculativeErr == nil || selectedOnlyErr.Error() != speculativeErr.Error() {
		t.Fatalf("selected errors differ: selected-only %v, speculative %v", selectedOnlyErr, speculativeErr)
	}

	testBranchStarted := make(chan struct{})
	testBranchCanceled := make(chan struct{})
	var startedOnce sync.Once
	blocking := evaluatorFunc(func(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
		nodeID := request.Scope.NodeID
		if nodeID == "domain/tests/path" {
			startedOnce.Do(func() { close(testBranchStarted) })
			<-ctx.Done()
			close(testBranchCanceled)
			return evaluationResponse{}, ctx.Err()
		}
		if nodeID == "domain" {
			<-testBranchStarted
		}
		value := routeAnswers()[nodeID]
		return evaluationResponse{Model: "recorded", Answers: map[string]answer{"route": value}}, nil
	})
	if _, err := interpretRoutePlanSpeculative(context.Background(), plan, defaultModel, blocking); err != nil {
		t.Fatal(err)
	}
	select {
	case <-testBranchCanceled:
	default:
		t.Fatal("discarded speculative branch was not canceled")
	}
}

func TestParseOptionsSupportsTraceAndSpeculativeRouting(t *testing.T) {
	options, _, err := parseOptions([]string{"--trace", "--speculative-routing"})
	if err != nil {
		t.Fatal(err)
	}
	if !options.Trace || !options.SpeculativeRouting {
		t.Fatalf("options = %#v", options)
	}
	if !strings.Contains(usage, "--trace") || !strings.Contains(usage, "--speculative-routing") {
		t.Fatalf("usage does not describe new options:\n%s", usage)
	}
}
