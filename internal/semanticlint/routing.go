package semanticlint

import (
	"cmp"
	"context"
	"fmt"
	"math"
	"path"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/core"
	"github.com/andrueandersoncs/typescript-go/parser"
	"github.com/andrueandersoncs/typescript-go/tspath"
	"golang.org/x/sync/errgroup"
)

type routingUsage struct {
	model        string
	inputTokens  int
	outputTokens int
}

type routedHunk struct {
	file DiffFile
	hunk DiffHunk
}

type scored[T any] struct {
	value          T
	logProbability float64
	decisions      int
}

type routePlan struct {
	rule    Rule
	domains routeChoice[routeDomain]
}

type routeDomain struct {
	name  string
	paths routeChoice[routePath]
}

type routePath struct {
	file  DiffFile
	hunks routeChoice[routedHunk]
}

type routeChoice[T any] struct {
	stage   string
	options []routeChoiceOption[T]
}

type routeChoiceOption[T any] struct {
	id          string
	description string
	value       T
	members     *routeChoice[T]
}

type routeExecution[T any] struct {
	selected  []scored[T]
	decisions []RoutingDecision
	usage     routingUsage
}

type ruleResult struct {
	finding Finding
	usage   routingUsage
}

type relevancePlan struct {
	rule       Rule
	candidates []Evidence
	judgments  []relevanceJudgment
}

type relevanceJudgment struct {
	candidateIndex int
	questionID     string
	question       question
}

type relevanceEvaluation struct {
	judgments []relevanceJudgment
	request   evaluationRequest
}

type interpretedRelevance struct {
	evidence []Evidence
	usage    routingUsage
}

type selectedEvidence struct {
	rule       Rule
	evidence   []Evidence
	hasChanged bool
}

type finalJudgmentPlan struct {
	selected   selectedEvidence
	questionID string
	question   question
}

type interpretedFinalJudgment struct {
	probability float64
	usage       routingUsage
}

type relation struct {
	path     string
	relation string
}
type ruleQuestion struct {
	Source           string   `json:"source"`
	Definition       string   `json:"definition"`
	Scope            string   `json:"scope"`
	RequiredEvidence []string `json:"requiredEvidence"`
}

type choiceInstruction struct {
	Task     string       `json:"task"`
	Stage    string       `json:"stage"`
	Rule     ruleQuestion `json:"rule"`
	Guidance string       `json:"guidance"`
}

type relevanceInstruction struct {
	Task        string       `json:"task"`
	CandidateID string       `json:"candidateId"`
	Rule        ruleQuestion `json:"rule"`
}

type finalInstruction struct {
	Task     string       `json:"task"`
	Rule     ruleQuestion `json:"rule"`
	Guidance string       `json:"guidance"`
}

type choiceState struct {
	Stage        string   `json:"stage"`
	CandidateIDs []string `json:"candidateIds"`
}

type relevanceState struct {
	EvidenceCandidates []evidenceStateItem `json:"evidenceCandidates"`
}

type finalState struct {
	ChangedEvidence    []evidenceStateItem `json:"changedEvidence"`
	SupportingEvidence []evidenceStateItem `json:"supportingEvidence"`
}

type evidenceStateItem struct {
	ID        any    `json:"id"`
	Kind      any    `json:"kind"`
	Relation  any    `json:"relation"`
	Path      string `json:"path"`
	StartLine any    `json:"startLine"`
	EndLine   any    `json:"endLine"`
	Snippet   any    `json:"snippet"`
}

var evidenceDomains = map[string]string{
	"source":               "Changed application or library source code.",
	"tests":                "Changed tests, fixtures, or test configuration.",
	"configuration":        "Changed runtime, build, lint, or TypeScript configuration.",
	"dependencies":         "Changed package manifests or dependency lockfiles.",
	"documentation":        "Changed documentation or natural-language policy.",
	"repository_structure": "Changed files whose location or repository role is the evidence.",
}

func evaluateSemanticRules(ctx context.Context, rules []Rule, evidence RepositoryEvidence, options Options, evaluator evaluator) ([]Finding, Usage, string, error) {
	relations := repositoryRelations(evidence)
	results, err := concurrentMap(ctx, rules, func(ctx context.Context, _ int, rule Rule) (ruleResult, error) {
		return evaluateSemanticRule(ctx, rule, evidence, relations, options, evaluator)
	})
	if err != nil {
		return nil, Usage{}, "", err
	}
	findings := make([]Finding, len(results))
	usage := Usage{}
	model := fallbackModel(options.Model)
	for index, result := range results {
		findings[index] = result.finding
		usage.InputTokens += result.usage.inputTokens
		usage.OutputTokens += result.usage.outputTokens
		if result.usage.model != "" {
			model = result.usage.model
		}
	}
	return findings, usage, model, nil
}

func evaluateSemanticRule(ctx context.Context, rule Rule, repository RepositoryEvidence, relations map[string][]relation, options Options, evaluator evaluator) (ruleResult, error) {
	routePlan := buildRoutePlan(rule, repository.DiffFiles)
	route, err := interpretRoutePlan(ctx, routePlan, options.Model, evaluator)
	if err != nil {
		return ruleResult{}, err
	}

	selectedHunks := make([]routedHunk, len(route.selected))
	for index, item := range route.selected {
		selectedHunks[index] = item.value
	}
	var expandedEvidence []Evidence
	if len(selectedHunks) > 0 {
		expandedEvidence = expandEvidence(rule, selectedHunks, repository, relations)
	}

	relevancePlan := buildRelevancePlan(rule, expandedEvidence)
	relevance, err := interpretRelevancePlan(ctx, relevancePlan, options.Model, evaluator)
	if err != nil {
		return ruleResult{}, err
	}

	selected, relevanceDecisions := applyRelevancePolicy(rule, relevance.evidence, options.Model)
	decisions := append(route.decisions, relevanceDecisions...)
	usage := mergeUsage(fallbackModel(options.Model), route.usage, relevance.usage)
	if !selected.hasChanged {
		return ruleResult{finding: composeNotApplicableFinding(selected, decisions), usage: usage}, nil
	}

	finalPlan := buildFinalJudgmentPlan(selected)
	finalJudgment, err := interpretFinalJudgmentPlan(ctx, finalPlan, options.Model, evaluator)
	if err != nil {
		return ruleResult{}, err
	}
	finding := composeFinalFinding(selected, decisions, finalJudgment.probability, options.Threshold)
	return ruleResult{finding: finding, usage: mergeUsage(options.Model, usage, finalJudgment.usage)}, nil
}

func buildRoutePlan(rule Rule, diffFiles []DiffFile) routePlan {
	filesByDomain := make(map[string][]DiffFile)
	var domains []string
	for _, file := range diffFiles {
		if !rule.matchesPath(file.Path) {
			continue
		}
		domain := domainForPath(file.Path)
		if rule.Metadata.Scope == "source" && domain != "source" && domain != "tests" {
			continue
		}
		if _, exists := filesByDomain[domain]; !exists {
			domains = append(domains, domain)
		}
		filesByDomain[domain] = append(filesByDomain[domain], file)
	}

	domainOptions := make([]routeChoiceOption[routeDomain], 0, len(domains))
	for _, domain := range domains {
		files := filesByDomain[domain]
		paths := make([]string, len(files))
		pathOptions := make([]routeChoiceOption[routePath], len(files))
		for fileIndex, file := range files {
			paths[fileIndex] = file.Path
			hunks := file.Hunks
			if len(hunks) == 0 {
				hunks = []DiffHunk{syntheticHunk(file)}
			}
			hunkOptions := make([]routeChoiceOption[routedHunk], len(hunks))
			for hunkIndex, hunk := range hunks {
				description := fmt.Sprintf("%s:%d %s\n%s", hunk.Path, hunk.NewStartLine, hunk.Header, truncateBytes(hunk.Patch, maximumEvidenceSnippetBytes/3))
				hunkOptions[hunkIndex] = routeChoiceOption[routedHunk]{id: hunk.ID, description: description, value: routedHunk{file: file, hunk: hunk}}
			}
			pathOptions[fileIndex] = routeChoiceOption[routePath]{
				id:          file.ID,
				description: fileDescription(file),
				value:       routePath{file: file, hunks: buildRouteChoice("hunk", hunkOptions)},
			}
		}
		domainOptions = append(domainOptions, routeChoiceOption[routeDomain]{
			id:          "domain_" + domain,
			description: evidenceDomains[domain] + " Changed files: " + strings.Join(paths, ", "),
			value:       routeDomain{name: domain, paths: buildRouteChoice("path", pathOptions)},
		})
	}
	return routePlan{rule: rule, domains: buildRouteChoice("domain", domainOptions)}
}

func buildRouteChoice[T any](stage string, candidates []routeChoiceOption[T]) routeChoice[T] {
	options := append([]routeChoiceOption[T]{}, candidates...)
	candidateLimit := maximumChoiceOptions - 1
	for depth := 0; len(options) > candidateLimit; depth++ {
		buckets := make([]routeChoiceOption[T], 0, (len(options)+candidateLimit-1)/candidateLimit)
		for start := 0; start < len(options); start += candidateLimit {
			end := min(len(options), start+candidateLimit)
			members := append([]routeChoiceOption[T]{}, options[start:end]...)
			descriptions := make([]string, len(members))
			for index, member := range members {
				descriptions[index] = member.description
			}
			choice := routeChoice[T]{stage: stage, options: members}
			buckets = append(buckets, routeChoiceOption[T]{
				id:          fmt.Sprintf("bucket_%d_%d", depth, len(buckets)+1),
				description: strings.Join(descriptions, "; "),
				members:     &choice,
			})
		}
		options = buckets
	}
	return routeChoice[T]{stage: stage, options: options}
}

func (choice routeChoice[T]) candidates() []routeChoiceOption[T] {
	var candidates []routeChoiceOption[T]
	for _, option := range choice.options {
		if option.members != nil {
			candidates = append(candidates, option.members.candidates()...)
			continue
		}
		candidates = append(candidates, option)
	}
	return candidates
}

func interpretRoutePlan(ctx context.Context, plan routePlan, model string, evaluator evaluator) (routeExecution[routedHunk], error) {
	domainRoute, err := interpretRouteChoice(ctx, plan.rule, plan.domains, model, evaluator)
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	fileRoutes, err := concurrentMap(ctx, domainRoute.selected, func(ctx context.Context, _ int, selectedDomain scored[routeDomain]) (routeExecution[routePath], error) {
		return interpretRouteChoice(ctx, plan.rule, selectedDomain.value.paths, model, evaluator)
	})
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	var fileSelected []scored[routePath]
	decisions := append([]RoutingDecision{}, domainRoute.decisions...)
	usages := []routingUsage{domainRoute.usage}
	for index, route := range fileRoutes {
		for _, item := range route.selected {
			fileSelected = append(fileSelected, joined(domainRoute.selected[index], item))
		}
		decisions = append(decisions, route.decisions...)
		usages = append(usages, route.usage)
	}
	fileSelected = best(fileSelected, beamWidth)
	hunkRoutes, err := concurrentMap(ctx, fileSelected, func(ctx context.Context, _ int, selectedFile scored[routePath]) (routeExecution[routedHunk], error) {
		return interpretRouteChoice(ctx, plan.rule, selectedFile.value.hunks, model, evaluator)
	})
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	var hunkSelected []scored[routedHunk]
	for index, route := range hunkRoutes {
		for _, item := range route.selected {
			hunkSelected = append(hunkSelected, joined(fileSelected[index], item))
		}
		decisions = append(decisions, route.decisions...)
		usages = append(usages, route.usage)
	}
	return routeExecution[routedHunk]{selected: best(hunkSelected, beamWidth), decisions: decisions, usage: mergeUsage(fallbackModel(model), usages...)}, nil
}

func interpretRouteChoice[T any](ctx context.Context, rule Rule, choice routeChoice[T], model string, evaluator evaluator) (routeExecution[T], error) {
	level, err := interpretRouteChoiceLevel(ctx, rule, choice, model, evaluator)
	if err != nil {
		return routeExecution[T]{}, err
	}
	if len(level.selected) == 0 {
		return routeExecution[T]{decisions: level.decisions, usage: level.usage}, nil
	}
	if level.selected[0].value.members == nil {
		selected := make([]scored[T], len(level.selected))
		for index, item := range level.selected {
			selected[index] = scored[T]{value: item.value.value, logProbability: item.logProbability, decisions: item.decisions}
		}
		return routeExecution[T]{selected: selected, decisions: level.decisions, usage: level.usage}, nil
	}

	memberRoutes, err := concurrentMap(ctx, level.selected, func(ctx context.Context, _ int, selectedBucket scored[routeChoiceOption[T]]) (routeExecution[T], error) {
		route, err := interpretRouteChoice(ctx, rule, *selectedBucket.value.members, model, evaluator)
		if err != nil {
			return routeExecution[T]{}, err
		}
		for index, candidate := range route.selected {
			route.selected[index] = joined(selectedBucket, candidate)
		}
		return route, nil
	})
	if err != nil {
		return routeExecution[T]{}, err
	}
	result := routeExecution[T]{
		decisions: append([]RoutingDecision{}, level.decisions...),
		usage:     level.usage,
	}
	for _, route := range memberRoutes {
		result.selected = append(result.selected, route.selected...)
		result.decisions = append(result.decisions, route.decisions...)
		result.usage = mergeUsage(fallbackModel(model), result.usage, route.usage)
	}
	result.selected = best(result.selected, beamWidth)
	return result, nil
}

func interpretRouteChoiceLevel[T any](ctx context.Context, rule Rule, choice routeChoice[T], model string, evaluator evaluator) (routeExecution[routeChoiceOption[T]], error) {
	fallback := fallbackModel(model)
	options := choice.options
	if len(options) == 0 {
		return routeExecution[routeChoiceOption[T]]{usage: routingUsage{model: fallback}}, nil
	}
	if len(options) == 1 {
		return routeExecution[routeChoiceOption[T]]{
			selected:  []scored[routeChoiceOption[T]]{{value: options[0], decisions: 1}},
			decisions: []RoutingDecision{{Stage: choice.stage, Candidate: options[0].id, Probability: 1, Selected: true}},
			usage:     routingUsage{model: fallback},
		}, nil
	}

	descriptionBytes := max(128, (maximumRequestBytes-len(rule.Definition)-4096)/(len(options)+1))
	criteria := make(map[string]any, len(options)+1)
	candidateIDs := make([]string, len(options))
	for index, option := range options {
		criteria[option.id] = truncateBytes(option.description, descriptionBytes)
		candidateIDs[index] = option.id
	}
	criteria["none"] = "None of these candidates supplies relevant evidence."
	criteriaOrder := append(append([]string{}, candidateIDs...), "none")
	request := evaluationRequest{
		State:         choiceState{Stage: choice.stage, CandidateIDs: candidateIDs},
		Model:         model,
		Questions:     map[string]question{"route": {Type: "choice", Instructions: routingInstructions(rule, choice.stage), Criteria: criteria, CriteriaOrder: criteriaOrder}},
		QuestionOrder: []string{"route"},
	}
	if requestSize(request) > maximumRequestBytes {
		return routeExecution[routeChoiceOption[T]]{usage: routingUsage{model: fallback}}, nil
	}
	response, err := evaluator.Evaluate(ctx, request)
	if err != nil {
		return routeExecution[routeChoiceOption[T]]{}, err
	}
	answer, ok := response.Answers["route"]
	if !ok || answer.Type != "choice" {
		return routeExecution[routeChoiceOption[T]]{}, fmt.Errorf("TypeSafe returned no Choice answer for %s", rule.ID)
	}

	type rankedOption struct {
		option      routeChoiceOption[T]
		probability float64
	}
	ranked := make([]rankedOption, len(options))
	for index, option := range options {
		ranked[index] = rankedOption{option: option, probability: answer.Probabilities[option.id]}
	}
	sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].probability > ranked[j].probability })
	var chosen *rankedOption
	if answer.Choice != "none" {
		for index := range ranked {
			if ranked[index].option.id == answer.Choice {
				chosen = &ranked[index]
				break
			}
		}
	}
	noneProbability := answer.Probabilities["none"]
	var selected []rankedOption
	if chosen != nil {
		selected = append(selected, *chosen)
		for _, item := range ranked {
			if item.option.id != answer.Choice && item.probability > noneProbability {
				selected = append(selected, item)
			}
		}
		selected = selected[:min(len(selected), beamWidth)]
	}
	selectedIDs := make(map[string]bool)
	result := routeExecution[routeChoiceOption[T]]{usage: usageFromResponse(response)}
	for _, item := range selected {
		selectedIDs[item.option.id] = true
		result.selected = append(result.selected, scored[routeChoiceOption[T]]{value: item.option, logProbability: math.Log(max(item.probability, math.Nextafter(1, 2)-1)), decisions: 1})
	}
	for _, item := range ranked {
		result.decisions = append(result.decisions, RoutingDecision{Stage: choice.stage, Candidate: item.option.id, Probability: item.probability, Selected: selectedIDs[item.option.id]})
	}
	result.decisions = append(result.decisions, RoutingDecision{Stage: choice.stage, Candidate: "none", Probability: noneProbability, Selected: answer.Choice == "none"})
	return result, nil
}

func routingInstructions(rule Rule, stage string) choiceInstruction {
	return choiceInstruction{Task: "Select the evidence candidate most likely to help decide this rule.", Stage: stage, Rule: ruleQuestionState(rule), Guidance: "Choose none when every candidate is unrelated. The caller retains several probable alternatives."}
}

func buildRelevancePlan(rule Rule, candidates []Evidence) relevancePlan {
	plan := relevancePlan{
		rule:       rule,
		candidates: append([]Evidence(nil), candidates...),
		judgments:  make([]relevanceJudgment, len(candidates)),
	}
	ruleState := ruleQuestionState(rule)
	for index, candidate := range candidates {
		candidateID := candidate.ID
		if candidateID == "" {
			candidateID = fmt.Sprintf("%s:%d", candidate.Path, max(candidate.StartLine, 1))
		}
		plan.judgments[index] = relevanceJudgment{
			candidateIndex: index,
			questionID:     fmt.Sprintf("evidence_%d", index+1),
			question: question{
				Type:          "noul",
				Instructions:  relevanceInstruction{Task: "Is this evidence candidate materially relevant to deciding whether the supplied rule is violated?", CandidateID: candidateID, Rule: ruleState},
				Criteria:      map[string]any{"true": "The candidate contains facts needed to apply the rule or compare the change with its surrounding contract or convention.", "false": "The candidate is incidental, merely nearby, or does not help decide the rule."},
				CriteriaOrder: []string{"true", "false"},
			},
		}
	}
	return plan
}

func interpretRelevancePlan(ctx context.Context, plan relevancePlan, model string, evaluator evaluator) (interpretedRelevance, error) {
	evaluations := relevanceEvaluations(plan, model)
	results, err := concurrentMap(ctx, evaluations, func(ctx context.Context, _ int, evaluation relevanceEvaluation) (interpretedRelevance, error) {
		response, err := evaluator.Evaluate(ctx, evaluation.request)
		if err != nil {
			return interpretedRelevance{}, err
		}
		scoredEvidence := make([]Evidence, len(evaluation.judgments))
		for index, judgment := range evaluation.judgments {
			answer, ok := response.Answers[judgment.questionID]
			if !ok || answer.Type != "noul" {
				return interpretedRelevance{}, fmt.Errorf("TypeSafe returned no relevance answer for %s", plan.rule.ID)
			}
			candidate := plan.candidates[judgment.candidateIndex]
			candidate.RelevanceProbability = answer.Noul
			scoredEvidence[index] = candidate
		}
		return interpretedRelevance{evidence: scoredEvidence, usage: usageFromResponse(response)}, nil
	})
	if err != nil {
		return interpretedRelevance{}, err
	}
	result := interpretedRelevance{usage: routingUsage{model: fallbackModel(model)}}
	usages := make([]routingUsage, 0, len(results))
	for _, evaluation := range results {
		result.evidence = append(result.evidence, evaluation.evidence...)
		usages = append(usages, evaluation.usage)
	}
	result.usage = mergeUsage(fallbackModel(model), usages...)
	return result, nil
}

func relevanceEvaluations(plan relevancePlan, model string) []relevanceEvaluation {
	var evaluations []relevanceEvaluation
	remaining := plan.judgments
	for len(remaining) > 0 {
		length := len(remaining)
		var evaluation relevanceEvaluation
		for length > 0 {
			evaluation = buildRelevanceEvaluation(plan, remaining[:length], model)
			if requestSize(evaluation.request) <= maximumRequestBytes {
				break
			}
			length--
		}
		if length == 0 {
			remaining = remaining[1:]
			continue
		}
		evaluations = append(evaluations, evaluation)
		remaining = remaining[length:]
	}
	return evaluations
}

func buildRelevanceEvaluation(plan relevancePlan, judgments []relevanceJudgment, model string) relevanceEvaluation {
	candidates := make([]Evidence, len(judgments))
	questions := make(map[string]question, len(judgments))
	questionOrder := make([]string, len(judgments))
	for index, judgment := range judgments {
		candidates[index] = plan.candidates[judgment.candidateIndex]
		questions[judgment.questionID] = judgment.question
		questionOrder[index] = judgment.questionID
	}
	return relevanceEvaluation{
		judgments: judgments,
		request: evaluationRequest{
			State:         relevanceState{EvidenceCandidates: evidenceState(candidates)},
			Model:         model,
			Questions:     questions,
			QuestionOrder: questionOrder,
		},
	}
}

func applyRelevancePolicy(rule Rule, evidence []Evidence, model string) (selectedEvidence, []RoutingDecision) {
	ranked := append([]Evidence(nil), evidence...)
	sort.SliceStable(ranked, func(i, j int) bool {
		return ranked[i].RelevanceProbability > ranked[j].RelevanceProbability
	})
	selectedIDs := make(map[string]bool)
	var relevant []Evidence
	for _, item := range ranked {
		if item.RelevanceProbability >= minimumRelevanceProbability && len(relevant) < maximumSelectedEvidence {
			relevant = append(relevant, item)
			selectedIDs[item.ID] = true
		}
	}
	decisions := make([]RoutingDecision, 0, len(ranked))
	for _, item := range ranked {
		candidate := item.ID
		if candidate == "" {
			candidate = item.Path
		}
		decisions = append(decisions, RoutingDecision{Stage: "relevance", Candidate: candidate, Probability: item.RelevanceProbability, Selected: selectedIDs[item.ID]})
	}
	for length := len(relevant); length > 0; length-- {
		selected := selectedEvidence{
			rule:       rule,
			evidence:   relevant[:length],
			hasChanged: slices.ContainsFunc(relevant[:length], isChangedEvidence),
		}
		if requestSize(finalJudgmentRequest(buildFinalJudgmentPlan(selected), model)) <= maximumRequestBytes {
			return selected, decisions
		}
	}
	return selectedEvidence{rule: rule, evidence: []Evidence{}}, decisions
}

func buildFinalJudgmentPlan(selected selectedEvidence) finalJudgmentPlan {
	return finalJudgmentPlan{
		selected:   selected,
		questionID: selected.rule.ID,
		question: question{
			Type:          "noul",
			Instructions:  finalInstruction{Task: "Does the identified candidate violate the supplied semantic lint rule?", Rule: ruleQuestionState(selected.rule), Guidance: "Judge only `changedEvidence`. `supportingEvidence` may establish a contract or convention, but it is not itself the candidate and must not be reported as a violation. The caller handles applicability and evidence sufficiency before asking this question."},
			Criteria:      map[string]any{"true": "The candidate contains a concrete violation supported by the supplied evidence.", "false": "The supplied evidence shows no concrete violation in the candidate."},
			CriteriaOrder: []string{"true", "false"},
		},
	}
}

func interpretFinalJudgmentPlan(ctx context.Context, plan finalJudgmentPlan, model string, evaluator evaluator) (interpretedFinalJudgment, error) {
	response, err := evaluator.Evaluate(ctx, finalJudgmentRequest(plan, model))
	if err != nil {
		return interpretedFinalJudgment{}, err
	}
	answer, ok := response.Answers[plan.questionID]
	if !ok || answer.Type != "noul" {
		return interpretedFinalJudgment{}, fmt.Errorf("TypeSafe returned no rule answer for %s", plan.questionID)
	}
	return interpretedFinalJudgment{probability: answer.Noul, usage: usageFromResponse(response)}, nil
}

func finalJudgmentRequest(plan finalJudgmentPlan, model string) evaluationRequest {
	var changed []Evidence
	var supporting []Evidence
	for _, item := range plan.selected.evidence {
		if isChangedEvidence(item) {
			changed = append(changed, item)
		} else {
			supporting = append(supporting, item)
		}
	}
	return evaluationRequest{
		State:         finalState{ChangedEvidence: evidenceState(changed), SupportingEvidence: evidenceState(supporting)},
		Model:         model,
		Questions:     map[string]question{plan.questionID: plan.question},
		QuestionOrder: []string{plan.questionID},
	}
}

func composeNotApplicableFinding(selected selectedEvidence, decisions []RoutingDecision) Finding {
	return Finding{
		RulePath:       selected.rule.Path,
		RuleTitle:      selected.rule.Title,
		Evaluator:      selected.rule.Metadata.Evaluator,
		Classification: "not_applicable",
		Message:        "No changed evidence candidate applies to this rule.",
		Evidence:       []Evidence{},
		Routing:        &Routing{Decisions: decisions, SelectedEvidenceIDs: []string{}},
	}
}

func composeFinalFinding(selected selectedEvidence, decisions []RoutingDecision, probability, threshold float64) Finding {
	classification := classificationFromProbability(probability, threshold)
	message := "The candidate needs review against this rule."
	findingEvidence := selected.evidence
	if classification == "pass" {
		message = "No concrete violation was found in this candidate."
		findingEvidence = []Evidence{}
	}
	selectedIDs := make([]string, 0, len(selected.evidence))
	for _, item := range selected.evidence {
		if item.ID != "" {
			selectedIDs = append(selectedIDs, item.ID)
		}
	}
	return Finding{
		RulePath:             selected.rule.Path,
		RuleTitle:            selected.rule.Title,
		Evaluator:            selected.rule.Metadata.Evaluator,
		Classification:       classification,
		Message:              message,
		ViolationProbability: &probability,
		Evidence:             findingEvidence,
		Routing:              &Routing{Decisions: decisions, SelectedEvidenceIDs: selectedIDs},
	}
}

func evidenceState(evidence []Evidence) []evidenceStateItem {
	copyOfEvidence := append([]Evidence{}, evidence...)
	sort.SliceStable(copyOfEvidence, func(i, j int) bool {
		left, right := copyOfEvidence[i], copyOfEvidence[j]
		if value := cmp.Compare(left.ID, right.ID); value != 0 {
			return value < 0
		}
		if value := cmp.Compare(left.Path, right.Path); value != 0 {
			return value < 0
		}
		if value := cmp.Compare(left.StartLine, right.StartLine); value != 0 {
			return value < 0
		}
		if value := cmp.Compare(left.EndLine, right.EndLine); value != 0 {
			return value < 0
		}
		if value := cmp.Compare(left.Kind, right.Kind); value != 0 {
			return value < 0
		}
		if value := cmp.Compare(left.Relation, right.Relation); value != 0 {
			return value < 0
		}
		return left.Snippet < right.Snippet
	})
	result := make([]evidenceStateItem, len(copyOfEvidence))
	for index, item := range copyOfEvidence {
		result[index] = evidenceStateItem{ID: nullableString(item.ID), Kind: nullableString(item.Kind), Relation: nullableString(item.Relation), Path: item.Path, StartLine: nullableInt(item.StartLine), EndLine: nullableInt(item.EndLine), Snippet: nullableString(item.Snippet)}
	}
	return result
}

func ruleQuestionState(rule Rule) ruleQuestion {
	return ruleQuestion{Source: rule.Path, Definition: rule.Definition, Scope: rule.Metadata.Scope, RequiredEvidence: rule.Metadata.RequiredEvidence}
}

func isChangedEvidence(evidence Evidence) bool {
	return evidence.Kind == "diff-hunk" || evidence.Kind == "source-context"
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func nullableInt(value int) any {
	if value == 0 {
		return nil
	}
	return value
}

func requestSize(request evaluationRequest) int {
	encoded, _ := marshalJSON(request)
	return len(encoded)
}

func classificationFromProbability(probability, threshold float64) string {
	if probability >= threshold {
		return "violation"
	}
	if probability <= maximumPassProbability {
		return "pass"
	}
	return "review"
}

func usageFromResponse(response evaluationResponse) routingUsage {
	return routingUsage{model: response.Model, inputTokens: response.Usage.InputTokens, outputTokens: response.Usage.OutputTokens}
}

func fallbackModel(model string) string {
	if model == "" {
		return defaultModel
	}
	return model
}

func mergeUsage(fallback string, usages ...routingUsage) routingUsage {
	result := routingUsage{model: fallbackModel(fallback)}
	for _, usage := range usages {
		if usage.model != "" {
			result.model = usage.model
		}
		result.inputTokens += usage.inputTokens
		result.outputTokens += usage.outputTokens
	}
	return result
}

func best[T any](values []scored[T], width int) []scored[T] {
	sort.SliceStable(values, func(i, j int) bool { return probabilityScore(values[i]) > probabilityScore(values[j]) })
	return values[:min(len(values), width)]
}

func probabilityScore[T any](value scored[T]) float64 {
	return math.Exp(value.logProbability / float64(max(value.decisions, 1)))
}

func joined[T, U any](parent scored[T], child scored[U]) scored[U] {
	return scored[U]{value: child.value, logProbability: parent.logProbability + child.logProbability, decisions: parent.decisions + child.decisions}
}

func truncateBytes(value string, maximum int) string {
	if len(value) <= maximum {
		return value
	}
	prefix := maximum
	for prefix > 0 && !utf8.RuneStart(value[prefix]) {
		prefix--
	}
	return value[:prefix] + "\n[truncated]"
}

func domainForPath(name string) string {
	normalized := filepath.ToSlash(name)
	base := strings.ToLower(path.Base(normalized))
	if regexp.MustCompile(`(^|/)(__tests__|tests?|fixtures?)(/|$)`).MatchString(normalized) || regexp.MustCompile(`\.(test|spec)\.[^.]+$`).MatchString(base) {
		return "tests"
	}
	if base == "package.json" || strings.HasPrefix(base, "bun.lock") || regexp.MustCompile(`(?:^|-)lock\.(?:json|yaml|yml)$`).MatchString(base) {
		return "dependencies"
	}
	extension := path.Ext(base)
	if base == "bunfig.toml" || strings.HasPrefix(base, "tsconfig") || strings.Contains(base, "config") || extension == ".toml" || extension == ".yaml" || extension == ".yml" {
		return "configuration"
	}
	if extension == ".md" || extension == ".mdx" || extension == ".txt" {
		return "documentation"
	}
	if codeExtensions[extension] {
		return "source"
	}
	return "repository_structure"
}

func fileDescription(file DiffFile) string {
	headers := make([]string, 0, 4)
	for _, hunk := range file.Hunks {
		if hunk.Header != "" {
			headers = append(headers, hunk.Header)
			if len(headers) == 4 {
				break
			}
		}
	}
	description := file.Status + " " + file.Path
	if len(headers) > 0 {
		description += "; " + strings.Join(headers, "; ")
	}
	return description
}

func syntheticHunk(file DiffFile) DiffHunk {
	return DiffHunk{ID: file.ID + "_hunk_0", Path: file.Path, OldStartLine: 1, NewStartLine: 1, Header: file.Status + " file without textual hunks", Patch: file.Status + ": " + file.Path}
}

func repositoryRelations(repository RepositoryEvidence) map[string][]relation {
	sourceByPath := make(map[string]Source)
	for _, source := range repository.Files {
		sourceByPath[source.Path] = source
	}
	result := make(map[string][]relation)
	for _, source := range repository.Files {
		for _, specifier := range importSpecifiers(source) {
			if target := resolvedRelativeImport(source.Path, specifier, sourceByPath); target != "" {
				result[source.Path] = appendUniqueRelation(result[source.Path], relation{path: target, relation: "imported dependency"})
				result[target] = appendUniqueRelation(result[target], relation{path: source.Path, relation: "importer"})
			}
		}
		for _, directory := range ancestorDirectories(source.Path) {
			for _, name := range []string{"package.json", "tsconfig.json", "bunfig.toml"} {
				candidate := name
				if directory != "." {
					candidate = path.Join(directory, name)
				}
				if _, ok := sourceByPath[candidate]; ok {
					result[source.Path] = appendUniqueRelation(result[source.Path], relation{path: candidate, relation: "owning configuration"})
				}
			}
		}
	}
	var tests []Source
	for _, source := range repository.Files {
		if domainForPath(source.Path) == "tests" {
			tests = append(tests, source)
		}
	}
	for _, source := range repository.Files {
		stem := strings.TrimSuffix(path.Base(source.Path), path.Ext(source.Path))
		stem = strings.TrimSuffix(strings.TrimSuffix(stem, ".test"), ".spec")
		for _, test := range tests {
			if strings.Contains(path.Base(test.Path), stem) {
				result[source.Path] = appendUniqueRelation(result[source.Path], relation{path: test.Path, relation: "matching test"})
			}
		}
	}
	return result
}

func appendUniqueRelation(values []relation, candidate relation) []relation {
	for _, value := range values {
		if value == candidate {
			return values
		}
	}
	return append(values, candidate)
}

func ancestorDirectories(name string) []string {
	var result []string
	for directory := path.Dir(name); ; directory = path.Dir(directory) {
		result = append(result, directory)
		if directory == "." {
			return result
		}
	}
}

func importSpecifiers(source Source) (result []string) {
	scriptKind := core.ScriptKindUnknown
	switch path.Ext(source.Path) {
	case ".ts":
		scriptKind = core.ScriptKindTS
	case ".tsx":
		scriptKind = core.ScriptKindTSX
	case ".js", ".mjs", ".cjs":
		scriptKind = core.ScriptKindJS
	case ".jsx":
		scriptKind = core.ScriptKindJSX
	default:
		return nil
	}
	defer func() {
		if recover() != nil {
			result = nil
		}
	}()
	fileName := tspath.NormalizePath("/" + strings.TrimPrefix(source.Path, "/"))
	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{FileName: fileName}, source.Text, scriptKind)
	appendLiteral := func(node *ast.Node) {
		if node != nil && ast.IsStringLiteralLike(node) {
			result = append(result, node.Text())
		}
	}
	var visit ast.Visitor
	visit = func(node *ast.Node) bool {
		switch {
		case ast.IsImportDeclaration(node):
			declaration := node.AsImportDeclaration()
			if importDeclarationHasValue(declaration) {
				appendLiteral(declaration.ModuleSpecifier)
			}
		case ast.IsExportDeclaration(node):
			declaration := node.AsExportDeclaration()
			if exportDeclarationHasValue(declaration) {
				appendLiteral(declaration.ModuleSpecifier)
			}
		case ast.IsCallExpression(node):
			call := node.AsCallExpression()
			if call.Expression.Kind == ast.KindImportKeyword && call.Arguments != nil && len(call.Arguments.Nodes) > 0 {
				appendLiteral(call.Arguments.Nodes[0])
			}
		}
		return node.ForEachChild(visit)
	}
	sourceFile.ForEachChild(visit)
	return result
}

func importDeclarationHasValue(declaration *ast.ImportDeclaration) bool {
	clause := declaration.ImportClause
	if clause == nil {
		return true
	}
	value := clause.AsImportClause()
	if value.PhaseModifier == ast.KindTypeKeyword {
		return false
	}
	if value.Name() != nil || value.NamedBindings == nil || ast.IsNamespaceImport(value.NamedBindings) {
		return true
	}
	if !ast.IsNamedImports(value.NamedBindings) {
		return false
	}
	for _, specifier := range value.NamedBindings.AsNamedImports().Elements.Nodes {
		if !specifier.AsImportSpecifier().IsTypeOnly {
			return true
		}
	}
	return false
}

func exportDeclarationHasValue(declaration *ast.ExportDeclaration) bool {
	if declaration.IsTypeOnly {
		return false
	}
	if declaration.ExportClause == nil || ast.IsNamespaceExport(declaration.ExportClause) {
		return true
	}
	if !ast.IsNamedExports(declaration.ExportClause) {
		return false
	}
	for _, specifier := range declaration.ExportClause.AsNamedExports().Elements.Nodes {
		if !specifier.AsExportSpecifier().IsTypeOnly {
			return true
		}
	}
	return false
}

func resolvedRelativeImport(sourcePath, specifier string, sources map[string]Source) string {
	if !strings.HasPrefix(specifier, ".") {
		return ""
	}
	base := path.Clean(path.Join(path.Dir(sourcePath), specifier))
	candidates := []string{base}
	for _, extension := range codeExtensionOrder {
		candidates = append(candidates, base+extension)
	}
	for _, extension := range codeExtensionOrder {
		candidates = append(candidates, path.Join(base, "index"+extension))
	}
	for _, candidate := range candidates {
		if _, ok := sources[candidate]; ok {
			return candidate
		}
	}
	return ""
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func expandEvidence(rule Rule, routed []routedHunk, repository RepositoryEvidence, relations map[string][]relation) []Evidence {
	sourceByPath := make(map[string]Source)
	for _, source := range repository.Files {
		sourceByPath[source.Path] = source
	}
	var candidates []Evidence
	if rule.Metadata.Evaluator == "review" && repository.ReviewContext != nil {
		candidates = append(candidates, sourceEvidence(*repository.ReviewContext, "review_context", "review-context", "supplied requirement or rationale", 1, 0))
	}
	for _, selected := range routed {
		start, count := selected.hunk.NewStartLine, selected.hunk.NewLineCount
		if count == 0 {
			start, count = selected.hunk.OldStartLine, selected.hunk.OldLineCount
		}
		candidates = append(candidates, Evidence{ID: selected.hunk.ID, Kind: "diff-hunk", Relation: "routed change", Path: selected.file.Path, StartLine: start, EndLine: start + max(count-1, 0), Snippet: truncateBytes(selected.hunk.Patch, maximumEvidenceSnippetBytes)})
		if source, ok := sourceByPath[selected.file.Path]; ok {
			target := max(selected.hunk.NewStartLine, 1)
			for _, chunk := range sourceCandidates(source) {
				if chunk.StartLine <= target && chunk.EndLine >= target {
					candidates = append(candidates, Evidence{ID: selected.hunk.ID + "_source", Kind: "source-context", Relation: "enclosing changed source", Path: source.Path, StartLine: chunk.StartLine, EndLine: chunk.EndLine, Snippet: truncateBytes(chunk.Text, maximumEvidenceSnippetBytes)})
					break
				}
			}
		}
		for index, related := range relations[selected.file.Path] {
			if source, ok := sourceByPath[related.path]; ok {
				candidates = append(candidates, sourceEvidence(source, fmt.Sprintf("%s_related_%d", selected.hunk.ID, index+1), "repository-context", related.relation, 1, 0))
			}
		}
		if rule.Metadata.Scope == "repository" {
			peerCount := 0
			for _, peer := range repository.Files {
				if path.Dir(peer.Path) == path.Dir(selected.file.Path) && peer.Path != selected.file.Path && peerCount < maximumExpandedCandidates {
					peerCount++
					candidates = append(candidates, sourceEvidence(peer, fmt.Sprintf("%s_peer_%d", selected.hunk.ID, peerCount), "repository-context", "same-directory convention", 1, 0))
				}
			}
		}
	}
	seen := make(map[string]bool)
	result := make([]Evidence, 0, min(len(candidates), maximumExpandedCandidates))
	for _, candidate := range candidates {
		key := fmt.Sprintf("%s:%s:%d:%d", candidate.Kind, candidate.Path, candidate.StartLine, candidate.EndLine)
		if !seen[key] && len(result) < maximumExpandedCandidates {
			seen[key] = true
			result = append(result, candidate)
		}
	}
	return result
}

func sourceEvidence(source Source, id, kind, relation string, start, end int) Evidence {
	if end == 0 {
		end = len(strings.Split(source.Text, "\n"))
	}
	return Evidence{ID: id, Kind: kind, Relation: relation, Path: source.Path, StartLine: start, EndLine: end, Snippet: truncateBytes(source.Text, maximumEvidenceSnippetBytes)}
}
func concurrentMap[T, U any](ctx context.Context, values []T, transform func(context.Context, int, T) (U, error)) ([]U, error) {
	results := make([]U, len(values))
	group, groupContext := errgroup.WithContext(ctx)
	for index, value := range values {
		group.Go(func() error {
			result, err := transform(groupContext, index, value)
			if err == nil {
				results[index] = result
			}
			return err
		})
	}
	if err := group.Wait(); err != nil {
		return nil, err
	}
	return results, nil
}
