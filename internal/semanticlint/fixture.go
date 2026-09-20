package semanticlint

import (
	"context"
	"fmt"
	"sort"
	"sync"
)

type planFixture struct {
	Answers map[string]answer `json:"answers"`
	Model   string            `json:"model,omitempty"`
	Usage   Usage             `json:"usage,omitempty"`
}

type fixtureEvaluator struct {
	stage    string
	fixture  planFixture
	declared map[string]bool

	mu   sync.Mutex
	used map[string]bool
}

func newFixtureEvaluator(stage string, fixture planFixture, declared []string) (*fixtureEvaluator, error) {
	known := make(map[string]bool, len(declared))
	for _, key := range declared {
		known[key] = true
	}
	for key := range fixture.Answers {
		if !known[key] {
			return nil, fmt.Errorf("fixture %s %s: answer is not declared by the plan", stage, key)
		}
	}
	return &fixtureEvaluator{stage: stage, fixture: fixture, declared: known, used: make(map[string]bool)}, nil
}

func (fixture *fixtureEvaluator) Evaluate(_ context.Context, request evaluationRequest) (evaluationResponse, error) {
	answers := make(map[string]answer, len(request.Questions))
	fixture.mu.Lock()
	defer fixture.mu.Unlock()
	for _, questionID := range orderedQuestionIDs(request) {
		key := request.Scope.key(questionID)
		value, ok := fixture.fixture.Answers[key]
		if !ok {
			return evaluationResponse{}, fmt.Errorf("fixture %s %s: answer is missing", fixture.stage, key)
		}
		if err := validateFixtureAnswer(fixture.stage, key, request.Questions[questionID], value); err != nil {
			return evaluationResponse{}, err
		}
		fixture.used[key] = true
		answers[questionID] = value
	}
	model := fixture.fixture.Model
	if model == "" {
		model = "fixture"
	}
	return evaluationResponse{Model: model, Answers: answers, Usage: fixture.fixture.Usage, Partition: evaluationHash(request)}, nil
}

func validateFixtureAnswer(stage, key string, declared question, value answer) error {
	if value.Type != declared.Type {
		return fmt.Errorf("fixture %s %s: answer type %q does not match %q", stage, key, value.Type, declared.Type)
	}
	switch declared.Type {
	case "noul":
		if !finiteProbability(value.Noul) {
			return fmt.Errorf("fixture %s %s: Noul probability is invalid", stage, key)
		}
	case "choice":
		if _, ok := declared.Criteria[value.Choice]; !ok {
			return fmt.Errorf("fixture %s %s: choice %q is not declared", stage, key, value.Choice)
		}
		for candidate := range declared.Criteria {
			probability, ok := value.Probabilities[candidate]
			if !ok || !finiteProbability(probability) {
				return fmt.Errorf("fixture %s %s: probability for %q is missing or invalid", stage, key, candidate)
			}
		}
		for candidate := range value.Probabilities {
			if _, ok := declared.Criteria[candidate]; !ok {
				return fmt.Errorf("fixture %s %s: probability for undeclared choice %q", stage, key, candidate)
			}
		}
	default:
		return fmt.Errorf("fixture %s %s: unsupported question type %q", stage, key, declared.Type)
	}
	return nil
}

func (fixture *fixtureEvaluator) checkUnused(strict bool) error {
	if !strict {
		return nil
	}
	fixture.mu.Lock()
	defer fixture.mu.Unlock()
	var unused []string
	for key := range fixture.fixture.Answers {
		if !fixture.used[key] {
			unused = append(unused, key)
		}
	}
	sort.Strings(unused)
	if len(unused) > 0 {
		return fmt.Errorf("fixture %s %s: answer was not used", fixture.stage, unused[0])
	}
	return nil
}

func interpretRouteFixture(ctx context.Context, plan routePlan, model string, fixture planFixture, strict bool) (routeExecution[routedHunk], error) {
	if err := validateRoutePlan(plan); err != nil {
		return routeExecution[routedHunk]{}, err
	}
	inspection := inspectRoutePlan(plan, model)
	var declared []string
	for _, node := range inspection.Nodes {
		if node.QuestionID != "" && node.Disposition != "stopped_too_large" {
			declared = append(declared, questionScope{RuleID: plan.rule.ID, Stage: node.Stage, NodeID: node.NodeID}.key(node.QuestionID))
		}
	}
	evaluator, err := newFixtureEvaluator("route", fixture, declared)
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	result, err := interpretRoutePlan(ctx, plan, model, evaluator)
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	if err := evaluator.checkUnused(strict); err != nil {
		return routeExecution[routedHunk]{}, err
	}
	return result, nil
}

func interpretRelevanceFixture(ctx context.Context, plan relevancePlan, model string, fixture planFixture, strict bool) (interpretedRelevance, error) {
	if err := validateRelevancePlan(plan); err != nil {
		return interpretedRelevance{}, err
	}
	declared := make([]string, len(plan.judgments))
	for index, judgment := range plan.judgments {
		declared[index] = questionScope{RuleID: plan.rule.ID, Stage: "relevance", NodeID: "relevance"}.key(judgment.questionID)
	}
	evaluator, err := newFixtureEvaluator("relevance", fixture, declared)
	if err != nil {
		return interpretedRelevance{}, err
	}
	result, err := interpretRelevancePlan(ctx, plan, model, evaluator)
	if err != nil {
		return interpretedRelevance{}, err
	}
	if err := evaluator.checkUnused(strict); err != nil {
		return interpretedRelevance{}, err
	}
	return result, nil
}

func interpretFinalFixture(ctx context.Context, plan finalJudgmentPlan, model string, fixture planFixture, strict bool) (interpretedFinalJudgment, error) {
	if err := validateFinalJudgmentPlan(plan); err != nil {
		return interpretedFinalJudgment{}, err
	}
	declared := []string{questionScope{RuleID: plan.selected.rule.ID, Stage: "final", NodeID: "final"}.key(plan.questionID)}
	evaluator, err := newFixtureEvaluator("final", fixture, declared)
	if err != nil {
		return interpretedFinalJudgment{}, err
	}
	result, err := interpretFinalJudgmentPlan(ctx, plan, model, evaluator)
	if err != nil {
		return interpretedFinalJudgment{}, err
	}
	if err := evaluator.checkUnused(strict); err != nil {
		return interpretedFinalJudgment{}, err
	}
	return result, nil
}
