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

type routeOption[T any] struct {
	id          string
	description string
	value       T
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
type relevanceBatchResult struct {
	evidence []Evidence
	usage    routingUsage
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
	route, err := routeRuleHunks(ctx, rule, repository.DiffFiles, options.Model, evaluator)
	if err != nil {
		return ruleResult{}, err
	}
	selectedHunks := make([]routedHunk, len(route.selected))
	for index, item := range route.selected {
		selectedHunks[index] = item.value
	}
	var relevance []Evidence
	var relevanceDecisions []RoutingDecision
	relevanceUsage := routingUsage{model: fallbackModel(options.Model)}
	if len(route.selected) > 0 {
		expanded := expandEvidence(rule, selectedHunks, repository, relations)
		relevance, relevanceDecisions, relevanceUsage, err = selectRelevantEvidence(ctx, rule, expanded, options.Model, evaluator)
		if err != nil {
			return ruleResult{}, err
		}
	}
	selected := fitFinalEvidence(rule, relevance, options.Model)
	decisions := append(route.decisions, relevanceDecisions...)
	usage := mergeUsage(fallbackModel(options.Model), route.usage, relevanceUsage)
	evaluatorName := rule.Metadata.Evaluator
	if !slices.ContainsFunc(selected, isChangedEvidence) {
		return ruleResult{finding: Finding{RulePath: rule.Path, RuleTitle: rule.Title, Evaluator: evaluatorName, Classification: "not_applicable", Message: "No changed evidence candidate applies to this rule.", Evidence: []Evidence{}, Routing: &Routing{Decisions: decisions, SelectedEvidenceIDs: []string{}}}, usage: usage}, nil
	}
	request := finalRequest(rule, selected, options.Model)
	response, err := evaluator.Evaluate(ctx, request)
	if err != nil {
		return ruleResult{}, err
	}
	answer, ok := response.Answers[rule.ID]
	if !ok || answer.Type != "noul" {
		return ruleResult{}, fmt.Errorf("TypeSafe returned no rule answer for %s", rule.ID)
	}
	classification := classificationFromProbability(answer.Noul, options.Threshold)
	message := "The candidate needs review against this rule."
	findingEvidence := selected
	if classification == "pass" {
		message = "No concrete violation was found in this candidate."
		findingEvidence = []Evidence{}
	}
	probability := answer.Noul
	selectedIDs := make([]string, 0, len(selected))
	for _, item := range selected {
		if item.ID != "" {
			selectedIDs = append(selectedIDs, item.ID)
		}
	}
	finding := Finding{RulePath: rule.Path, RuleTitle: rule.Title, Evaluator: evaluatorName, Classification: classification, Message: message, ViolationProbability: &probability, Evidence: findingEvidence, Routing: &Routing{Decisions: decisions, SelectedEvidenceIDs: selectedIDs}}
	return ruleResult{finding: finding, usage: mergeUsage(options.Model, usage, usageFromResponse(response))}, nil
}

func routeRuleHunks(ctx context.Context, rule Rule, diffFiles []DiffFile, model string, evaluator evaluator) (routeExecution[routedHunk], error) {
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
	domainOptions := make([]routeOption[string], 0, len(domains))
	for _, domain := range domains {
		files := filesByDomain[domain]
		paths := make([]string, len(files))
		for index, file := range files {
			paths[index] = file.Path
		}
		domainOptions = append(domainOptions, routeOption[string]{id: "domain_" + domain, description: evidenceDomains[domain] + " Changed files: " + strings.Join(paths, ", "), value: domain})
	}
	domainRoute, err := routeOptions(ctx, rule, "domain", domainOptions, model, evaluator, 0)
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	fileRoutes, err := concurrentMap(ctx, domainRoute.selected, func(ctx context.Context, _ int, selectedDomain scored[string]) (routeExecution[DiffFile], error) {
		files := filesByDomain[selectedDomain.value]
		options := make([]routeOption[DiffFile], len(files))
		for index, file := range files {
			options[index] = routeOption[DiffFile]{id: file.ID, description: fileDescription(file), value: file}
		}
		return routeOptions(ctx, rule, "path", options, model, evaluator, 0)
	})
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	var fileSelected []scored[DiffFile]
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
	hunkRoutes, err := concurrentMap(ctx, fileSelected, func(ctx context.Context, _ int, selectedFile scored[DiffFile]) (routeExecution[routedHunk], error) {
		hunks := selectedFile.value.Hunks
		if len(hunks) == 0 {
			hunks = []DiffHunk{syntheticHunk(selectedFile.value)}
		}
		options := make([]routeOption[routedHunk], len(hunks))
		for index, hunk := range hunks {
			description := fmt.Sprintf("%s:%d %s\n%s", hunk.Path, hunk.NewStartLine, hunk.Header, truncateBytes(hunk.Patch, maximumEvidenceSnippetBytes/3))
			options[index] = routeOption[routedHunk]{id: hunk.ID, description: description, value: routedHunk{file: selectedFile.value, hunk: hunk}}
		}
		return routeOptions(ctx, rule, "hunk", options, model, evaluator, 0)
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

func routeOptions[T any](ctx context.Context, rule Rule, stage string, options []routeOption[T], model string, evaluator evaluator, depth int) (routeExecution[T], error) {
	untyped := make([]routeOption[any], len(options))
	for index, option := range options {
		untyped[index] = routeOption[any]{id: option.id, description: option.description, value: option.value}
	}
	execution, err := routeOptionsAny(ctx, rule, stage, untyped, model, evaluator, depth)
	if err != nil {
		return routeExecution[T]{}, err
	}
	selected := make([]scored[T], len(execution.selected))
	for index, item := range execution.selected {
		value, ok := item.value.(T)
		if !ok {
			return routeExecution[T]{}, fmt.Errorf("semantic routing returned an invalid %s candidate", stage)
		}
		selected[index] = scored[T]{value: value, logProbability: item.logProbability, decisions: item.decisions}
	}
	return routeExecution[T]{selected: selected, decisions: execution.decisions, usage: execution.usage}, nil
}

func routeOptionsAny(ctx context.Context, rule Rule, stage string, options []routeOption[any], model string, evaluator evaluator, depth int) (routeExecution[any], error) {
	fallback := fallbackModel(model)
	if len(options) == 0 {
		return routeExecution[any]{usage: routingUsage{model: fallback}}, nil
	}
	if len(options) == 1 {
		return routeExecution[any]{selected: []scored[any]{{value: options[0].value, decisions: 1}}, decisions: []RoutingDecision{{Stage: stage, Candidate: options[0].id, Probability: 1, Selected: true}}, usage: routingUsage{model: fallback}}, nil
	}
	candidateLimit := maximumChoiceOptions - 1
	if len(options) > candidateLimit {
		bucketOptions := make([]routeOption[any], 0, (len(options)+candidateLimit-1)/candidateLimit)
		for start := 0; start < len(options); start += candidateLimit {
			end := min(len(options), start+candidateLimit)
			members := options[start:end]
			descriptions := make([]string, len(members))
			for index, member := range members {
				descriptions[index] = member.description
			}
			bucketOptions = append(bucketOptions, routeOption[any]{
				id:          fmt.Sprintf("bucket_%d_%d", depth, len(bucketOptions)+1),
				description: strings.Join(descriptions, "; "),
				value:       members,
			})
		}
		bucketRoute, err := routeOptionsAny(ctx, rule, stage, bucketOptions, model, evaluator, depth+1)
		if err != nil {
			return routeExecution[any]{}, err
		}
		memberRoutes, err := concurrentMap(ctx, bucketRoute.selected, func(ctx context.Context, _ int, selectedBucket scored[any]) (routeExecution[any], error) {
			members, ok := selectedBucket.value.([]routeOption[any])
			if !ok {
				return routeExecution[any]{}, fmt.Errorf("semantic routing returned an invalid %s bucket", stage)
			}
			route, err := routeOptionsAny(ctx, rule, stage, members, model, evaluator, depth+1)
			if err != nil {
				return routeExecution[any]{}, err
			}
			for index, candidate := range route.selected {
				route.selected[index] = joined(selectedBucket, candidate)
			}
			return route, nil
		})
		if err != nil {
			return routeExecution[any]{}, err
		}
		result := routeExecution[any]{
			decisions: append([]RoutingDecision{}, bucketRoute.decisions...),
			usage:     bucketRoute.usage,
		}
		for _, route := range memberRoutes {
			result.selected = append(result.selected, route.selected...)
			result.decisions = append(result.decisions, route.decisions...)
			result.usage = mergeUsage(fallback, result.usage, route.usage)
		}
		result.selected = best(result.selected, beamWidth)
		return result, nil
	}
	answer, answered, usage, err := askChoice(ctx, rule, stage, options, model, evaluator)
	if err != nil {
		return routeExecution[any]{}, err
	}
	if !answered {
		return routeExecution[any]{usage: usage}, nil
	}
	type rankedOption struct {
		option      routeOption[any]
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
	result := routeExecution[any]{usage: usage}
	for _, item := range selected {
		selectedIDs[item.option.id] = true
		result.selected = append(result.selected, scored[any]{value: item.option.value, logProbability: math.Log(max(item.probability, math.Nextafter(1, 2)-1)), decisions: 1})
	}
	for _, item := range ranked {
		result.decisions = append(result.decisions, RoutingDecision{Stage: stage, Candidate: item.option.id, Probability: item.probability, Selected: selectedIDs[item.option.id]})
	}
	result.decisions = append(result.decisions, RoutingDecision{Stage: stage, Candidate: "none", Probability: noneProbability, Selected: answer.Choice == "none"})
	return result, nil
}

func askChoice[T any](ctx context.Context, rule Rule, stage string, options []routeOption[T], model string, evaluator evaluator) (answer, bool, routingUsage, error) {
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
		State:         choiceState{Stage: stage, CandidateIDs: candidateIDs},
		Model:         model,
		Questions:     map[string]question{"route": {Type: "choice", Instructions: routingInstructions(rule, stage), Criteria: criteria, CriteriaOrder: criteriaOrder}},
		QuestionOrder: []string{"route"},
	}
	fallback := fallbackModel(model)
	if requestSize(request) > maximumRequestBytes {
		return answer{}, false, routingUsage{model: fallback}, nil
	}
	response, err := evaluator.Evaluate(ctx, request)
	if err != nil {
		return answer{}, false, routingUsage{}, err
	}
	answer, ok := response.Answers["route"]
	if !ok || answer.Type != "choice" {
		return answer, false, routingUsage{}, fmt.Errorf("TypeSafe returned no Choice answer for %s", rule.ID)
	}
	return answer, true, usageFromResponse(response), nil
}

func routingInstructions(rule Rule, stage string) choiceInstruction {
	return choiceInstruction{Task: "Select the evidence candidate most likely to help decide this rule.", Stage: stage, Rule: ruleQuestionState(rule), Guidance: "Choose none when every candidate is unrelated. The caller retains several probable alternatives."}
}

func selectRelevantEvidence(ctx context.Context, rule Rule, candidates []Evidence, model string, evaluator evaluator) ([]Evidence, []RoutingDecision, routingUsage, error) {
	batches := relevanceBatches(rule, candidates, model)
	results, err := concurrentMap(ctx, batches, func(ctx context.Context, _ int, batch []Evidence) (relevanceBatchResult, error) {
		request := relevanceRequest(rule, batch, model)
		response, err := evaluator.Evaluate(ctx, request)
		if err != nil {
			return relevanceBatchResult{}, err
		}
		scoredEvidence := make([]Evidence, len(batch))
		for index, candidate := range batch {
			answer, ok := response.Answers[fmt.Sprintf("evidence_%d", index+1)]
			if !ok || answer.Type != "noul" {
				return relevanceBatchResult{}, fmt.Errorf("TypeSafe returned no relevance answer for %s", rule.ID)
			}
			candidate.RelevanceProbability = answer.Noul
			scoredEvidence[index] = candidate
		}
		return relevanceBatchResult{evidence: scoredEvidence, usage: usageFromResponse(response)}, nil
	})
	if err != nil {
		return nil, nil, routingUsage{}, err
	}
	var scoredEvidence []Evidence
	var usages []routingUsage
	for _, result := range results {
		scoredEvidence = append(scoredEvidence, result.evidence...)
		usages = append(usages, result.usage)
	}
	sort.SliceStable(scoredEvidence, func(i, j int) bool {
		return scoredEvidence[i].RelevanceProbability > scoredEvidence[j].RelevanceProbability
	})
	selectedIDs := make(map[string]bool)
	var selected []Evidence
	for _, item := range scoredEvidence {
		if item.RelevanceProbability >= minimumRelevanceProbability && len(selected) < maximumSelectedEvidence {
			selected = append(selected, item)
			selectedIDs[item.ID] = true
		}
	}
	decisions := make([]RoutingDecision, 0, len(scoredEvidence))
	for _, item := range scoredEvidence {
		candidate := item.ID
		if candidate == "" {
			candidate = item.Path
		}
		decisions = append(decisions, RoutingDecision{Stage: "relevance", Candidate: candidate, Probability: item.RelevanceProbability, Selected: selectedIDs[item.ID]})
	}
	return selected, decisions, mergeUsage(fallbackModel(model), usages...), nil
}

func relevanceBatches(rule Rule, candidates []Evidence, model string) [][]Evidence {
	var batches [][]Evidence
	for len(candidates) > 0 {
		length := len(candidates)
		for length > 0 && requestSize(relevanceRequest(rule, candidates[:length], model)) > maximumRequestBytes {
			length--
		}
		if length == 0 {
			candidates = candidates[1:]
			continue
		}
		batches = append(batches, candidates[:length])
		candidates = candidates[length:]
	}
	return batches
}

func relevanceRequest(rule Rule, candidates []Evidence, model string) evaluationRequest {
	questions := make(map[string]question, len(candidates))
	questionOrder := make([]string, len(candidates))
	for index, candidate := range candidates {
		candidateID := candidate.ID
		if candidateID == "" {
			candidateID = fmt.Sprintf("%s:%d", candidate.Path, max(candidate.StartLine, 1))
		}
		questionID := fmt.Sprintf("evidence_%d", index+1)
		questionOrder[index] = questionID
		questions[questionID] = question{
			Type:          "noul",
			Instructions:  relevanceInstruction{Task: "Is this evidence candidate materially relevant to deciding whether the supplied rule is violated?", CandidateID: candidateID, Rule: ruleQuestionState(rule)},
			Criteria:      map[string]any{"true": "The candidate contains facts needed to apply the rule or compare the change with its surrounding contract or convention.", "false": "The candidate is incidental, merely nearby, or does not help decide the rule."},
			CriteriaOrder: []string{"true", "false"},
		}
	}
	return evaluationRequest{State: relevanceState{EvidenceCandidates: evidenceState(candidates)}, Model: model, Questions: questions, QuestionOrder: questionOrder}
}

func finalRequest(rule Rule, evidence []Evidence, model string) evaluationRequest {
	var changed []Evidence
	var supporting []Evidence
	for _, item := range evidence {
		if isChangedEvidence(item) {
			changed = append(changed, item)
		} else {
			supporting = append(supporting, item)
		}
	}
	return evaluationRequest{
		State: finalState{ChangedEvidence: evidenceState(changed), SupportingEvidence: evidenceState(supporting)},
		Model: model,
		Questions: map[string]question{rule.ID: {
			Type:          "noul",
			Instructions:  finalInstruction{Task: "Does the identified candidate violate the supplied semantic lint rule?", Rule: ruleQuestionState(rule), Guidance: "Judge only `changedEvidence`. `supportingEvidence` may establish a contract or convention, but it is not itself the candidate and must not be reported as a violation. The caller handles applicability and evidence sufficiency before asking this question."},
			Criteria:      map[string]any{"true": "The candidate contains a concrete violation supported by the supplied evidence.", "false": "The supplied evidence shows no concrete violation in the candidate."},
			CriteriaOrder: []string{"true", "false"},
		}},
		QuestionOrder: []string{rule.ID},
	}
}

func fitFinalEvidence(rule Rule, evidence []Evidence, model string) []Evidence {
	for length := len(evidence); length > 0; length-- {
		if requestSize(finalRequest(rule, evidence[:length], model)) <= maximumRequestBytes {
			return evidence[:length]
		}
	}
	return nil
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
