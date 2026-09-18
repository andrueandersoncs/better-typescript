package semanticlint

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"unicode/utf8"
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

type relation struct {
	path     string
	relation string
}

var importPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?m)^\s*(?:import|export)\b[^\n]*?\bfrom\s*["']([^"']+)["']`),
	regexp.MustCompile(`(?m)^\s*import\s*["']([^"']+)["']`),
	regexp.MustCompile(`\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)`),
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
	results := make([]ruleResult, len(rules))
	errors := make([]error, len(rules))
	var workers sync.WaitGroup
	for index, rule := range rules {
		workers.Add(1)
		go func() {
			defer workers.Done()
			results[index], errors[index] = evaluateSemanticRule(ctx, rule, evidence, relations, options, evaluator)
		}()
	}
	workers.Wait()
	for _, err := range errors {
		if err != nil {
			return nil, Usage{}, "", err
		}
	}
	findings := make([]Finding, len(results))
	usage := Usage{}
	model := options.Model
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
	expanded := expandEvidence(rule, selectedHunks, repository, relations)
	relevance, relevanceDecisions, relevanceUsage, err := selectRelevantEvidence(ctx, rule, expanded, options.Model, evaluator)
	if err != nil {
		return ruleResult{}, err
	}
	selected := fitFinalEvidence(rule, relevance, options.Model)
	decisions := append(route.decisions, relevanceDecisions...)
	usage := mergeUsage(options.Model, route.usage, relevanceUsage)
	evaluatorName := rule.Metadata.Evaluator
	if len(selected) == 0 {
		classification := "insufficient_evidence"
		message := "Layered routing found no sufficiently relevant bounded evidence."
		if rule.Metadata.Scope == "source" {
			classification = "not_applicable"
			message = "No changed evidence candidate applies to this source-scoped rule."
		}
		return ruleResult{finding: Finding{RulePath: rule.Path, RuleTitle: rule.Title, Evaluator: evaluatorName, Classification: classification, Message: message, Evidence: []Evidence{}, Routing: &Routing{Decisions: decisions, SelectedEvidenceIDs: []string{}}}, usage: usage}, nil
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
	for _, file := range diffFiles {
		if !rule.matchesPath(file.Path) {
			continue
		}
		domain := domainForPath(file.Path)
		if rule.Metadata.Scope == "source" && domain != "source" && domain != "tests" {
			continue
		}
		filesByDomain[domain] = append(filesByDomain[domain], file)
	}
	domains := make([]string, 0, len(filesByDomain))
	for domain := range filesByDomain {
		domains = append(domains, domain)
	}
	sort.Strings(domains)
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
	var fileSelected []scored[DiffFile]
	decisions := append([]RoutingDecision{}, domainRoute.decisions...)
	usages := []routingUsage{domainRoute.usage}
	for _, selectedDomain := range domainRoute.selected {
		files := filesByDomain[selectedDomain.value]
		options := make([]routeOption[DiffFile], len(files))
		for index, file := range files {
			options[index] = routeOption[DiffFile]{id: file.ID, description: fileDescription(file), value: file}
		}
		route, err := routeOptions(ctx, rule, "path", options, model, evaluator, 0)
		if err != nil {
			return routeExecution[routedHunk]{}, err
		}
		for _, item := range route.selected {
			fileSelected = append(fileSelected, joined(selectedDomain, item))
		}
		decisions = append(decisions, route.decisions...)
		usages = append(usages, route.usage)
	}
	fileSelected = best(fileSelected, beamWidth)
	var hunkSelected []scored[routedHunk]
	for _, selectedFile := range fileSelected {
		hunks := selectedFile.value.Hunks
		if len(hunks) == 0 {
			hunks = []DiffHunk{syntheticHunk(selectedFile.value)}
		}
		options := make([]routeOption[routedHunk], len(hunks))
		for index, hunk := range hunks {
			description := fmt.Sprintf("%s:%d %s\n%s", hunk.Path, hunk.NewStartLine, hunk.Header, truncateBytes(hunk.Patch, maximumEvidenceSnippetBytes/3))
			options[index] = routeOption[routedHunk]{id: hunk.ID, description: description, value: routedHunk{file: selectedFile.value, hunk: hunk}}
		}
		route, err := routeOptions(ctx, rule, "hunk", options, model, evaluator, 0)
		if err != nil {
			return routeExecution[routedHunk]{}, err
		}
		for _, item := range route.selected {
			hunkSelected = append(hunkSelected, joined(selectedFile, item))
		}
		decisions = append(decisions, route.decisions...)
		usages = append(usages, route.usage)
	}
	return routeExecution[routedHunk]{selected: best(hunkSelected, beamWidth), decisions: decisions, usage: mergeUsage(model, usages...)}, nil
}

func routeOptions[T any](ctx context.Context, rule Rule, stage string, options []routeOption[T], model string, evaluator evaluator, depth int) (routeExecution[T], error) {
	if len(options) == 0 {
		return routeExecution[T]{usage: routingUsage{model: model}}, nil
	}
	if len(options) == 1 {
		return routeExecution[T]{selected: []scored[T]{{value: options[0].value, decisions: 1}}, decisions: []RoutingDecision{{Stage: stage, Candidate: options[0].id, Probability: 1, Selected: true}}, usage: routingUsage{model: model}}, nil
	}
	candidateLimit := maximumChoiceOptions - 1
	if len(options) > candidateLimit {
		var zero T
		bucketMembers := make(map[string][]routeOption[T])
		bucketOptions := make([]routeOption[T], 0, (len(options)+candidateLimit-1)/candidateLimit)
		for start := 0; start < len(options); start += candidateLimit {
			end := min(len(options), start+candidateLimit)
			members := options[start:end]
			descriptions := make([]string, len(members))
			for index, member := range members {
				descriptions[index] = member.description
			}
			id := fmt.Sprintf("bucket_%d_%d", depth, len(bucketOptions)+1)
			bucketMembers[id] = members
			bucketOptions = append(bucketOptions, routeOption[T]{id: id, description: strings.Join(descriptions, "; "), value: zero})
		}
		bucketAnswer, bucketUsage, err := askChoice(ctx, rule, stage, bucketOptions, model, evaluator)
		if err != nil {
			return routeExecution[T]{}, err
		}
		type rankedBucket struct {
			id          string
			probability float64
		}
		ranked := make([]rankedBucket, len(bucketOptions))
		for index, bucket := range bucketOptions {
			ranked[index] = rankedBucket{id: bucket.id, probability: bucketAnswer.Probabilities[bucket.id]}
		}
		sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].probability > ranked[j].probability })
		noneProbability := bucketAnswer.Probabilities["none"]
		var selected []rankedBucket
		if bucketAnswer.Choice != "none" {
			for _, bucket := range ranked {
				if bucket.id == bucketAnswer.Choice || bucket.probability > noneProbability {
					selected = append(selected, bucket)
				}
			}
			selected = selected[:min(len(selected), beamWidth)]
		}
		selectedIDs := make(map[string]bool)
		result := routeExecution[T]{usage: bucketUsage}
		for _, bucket := range selected {
			selectedIDs[bucket.id] = true
			memberRoute, err := routeOptions(ctx, rule, stage, bucketMembers[bucket.id], model, evaluator, depth+1)
			if err != nil {
				return routeExecution[T]{}, err
			}
			parent := scored[string]{value: bucket.id, logProbability: math.Log(max(bucket.probability, math.SmallestNonzeroFloat64)), decisions: 1}
			for _, member := range memberRoute.selected {
				result.selected = append(result.selected, joined(parent, member))
			}
			result.decisions = append(result.decisions, memberRoute.decisions...)
			result.usage = mergeUsage(model, result.usage, memberRoute.usage)
		}
		bucketDecisions := make([]RoutingDecision, 0, len(ranked)+1)
		for _, bucket := range ranked {
			bucketDecisions = append(bucketDecisions, RoutingDecision{Stage: stage, Candidate: bucket.id, Probability: bucket.probability, Selected: selectedIDs[bucket.id]})
		}
		bucketDecisions = append(bucketDecisions, RoutingDecision{Stage: stage, Candidate: "none", Probability: noneProbability, Selected: bucketAnswer.Choice == "none"})
		result.decisions = append(bucketDecisions, result.decisions...)
		result.selected = best(result.selected, beamWidth)
		return result, nil
	}
	answer, usage, err := askChoice(ctx, rule, stage, options, model, evaluator)
	if err != nil {
		return routeExecution[T]{}, err
	}
	type rankedOption struct {
		option      routeOption[T]
		probability float64
	}
	ranked := make([]rankedOption, len(options))
	for index, option := range options {
		ranked[index] = rankedOption{option: option, probability: answer.Probabilities[option.id]}
	}
	sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].probability > ranked[j].probability })
	noneProbability := answer.Probabilities["none"]
	var selected []rankedOption
	if answer.Choice != "none" {
		for _, item := range ranked {
			if item.option.id == answer.Choice || item.probability > noneProbability {
				selected = append(selected, item)
			}
		}
		if len(selected) > beamWidth {
			selected = selected[:beamWidth]
		}
	}
	selectedIDs := make(map[string]bool)
	result := routeExecution[T]{usage: usage}
	for _, item := range selected {
		selectedIDs[item.option.id] = true
		result.selected = append(result.selected, scored[T]{value: item.option.value, logProbability: math.Log(max(item.probability, math.SmallestNonzeroFloat64)), decisions: 1})
	}
	for _, item := range ranked {
		result.decisions = append(result.decisions, RoutingDecision{Stage: stage, Candidate: item.option.id, Probability: item.probability, Selected: selectedIDs[item.option.id]})
	}
	result.decisions = append(result.decisions, RoutingDecision{Stage: stage, Candidate: "none", Probability: noneProbability, Selected: answer.Choice == "none"})
	return result, nil
}

func askChoice[T any](ctx context.Context, rule Rule, stage string, options []routeOption[T], model string, evaluator evaluator) (answer, routingUsage, error) {
	descriptionBytes := max(128, (maximumRequestBytes-len(rule.Definition)-4096)/(len(options)+1))
	var request evaluationRequest
	for {
		criteria := make(map[string]any, len(options)+1)
		candidateIDs := make([]string, len(options))
		for index, option := range options {
			criteria[option.id] = truncateBytes(option.description, descriptionBytes)
			candidateIDs[index] = option.id
		}
		criteria["none"] = "None of these candidates supplies relevant evidence."
		request = evaluationRequest{State: map[string]any{"stage": stage, "candidateIds": candidateIDs}, Model: model, Questions: map[string]question{"route": {Type: "choice", Instructions: routingInstructions(rule, stage), Criteria: criteria}}}
		if requestSize(request) <= maximumRequestBytes {
			break
		}
		if descriptionBytes == 128 {
			return answer{}, routingUsage{model: model}, fmt.Errorf("TypeSafe routing request for %s exceeds %d bytes", rule.ID, maximumRequestBytes)
		}
		descriptionBytes = max(128, descriptionBytes/2)
	}
	response, err := evaluator.Evaluate(ctx, request)
	if err != nil {
		return answer{}, routingUsage{}, err
	}
	answer, ok := response.Answers["route"]
	if !ok || answer.Type != "choice" {
		return answer, routingUsage{}, fmt.Errorf("TypeSafe returned no Choice answer for %s", rule.ID)
	}
	return answer, usageFromResponse(response), nil
}

func routingInstructions(rule Rule, stage string) map[string]any {
	return map[string]any{"task": "Select the evidence candidate most likely to help decide this rule.", "stage": stage, "rule": ruleQuestionState(rule), "guidance": "Choose none when every candidate is unrelated. The caller retains several probable alternatives."}
}

func selectRelevantEvidence(ctx context.Context, rule Rule, candidates []Evidence, model string, evaluator evaluator) ([]Evidence, []RoutingDecision, routingUsage, error) {
	batches := relevanceBatches(rule, candidates, model)
	var scoredEvidence []Evidence
	var decisions []RoutingDecision
	usage := routingUsage{model: model}
	for _, batch := range batches {
		request := relevanceRequest(rule, batch, model)
		response, err := evaluator.Evaluate(ctx, request)
		if err != nil {
			return nil, nil, routingUsage{}, err
		}
		usage = mergeUsage(model, usage, usageFromResponse(response))
		for index, candidate := range batch {
			answer, ok := response.Answers[fmt.Sprintf("evidence_%d", index+1)]
			if !ok || answer.Type != "noul" {
				return nil, nil, routingUsage{}, fmt.Errorf("TypeSafe returned no relevance answer for %s", rule.ID)
			}
			candidate.RelevanceProbability = answer.Noul
			scoredEvidence = append(scoredEvidence, candidate)
		}
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
	for _, item := range scoredEvidence {
		candidate := item.ID
		if candidate == "" {
			candidate = item.Path
		}
		decisions = append(decisions, RoutingDecision{Stage: "relevance", Candidate: candidate, Probability: item.RelevanceProbability, Selected: selectedIDs[item.ID]})
	}
	return selected, decisions, usage, nil
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
	for index, candidate := range candidates {
		candidateID := candidate.ID
		if candidateID == "" {
			candidateID = fmt.Sprintf("%s:%d", candidate.Path, max(candidate.StartLine, 1))
		}
		questions[fmt.Sprintf("evidence_%d", index+1)] = question{Type: "noul", Instructions: map[string]any{"task": "Is this evidence candidate materially relevant to deciding whether the supplied rule is violated?", "candidateId": candidateID, "rule": ruleQuestionState(rule)}, Criteria: map[string]any{"true": "The candidate contains facts needed to apply the rule or compare the change with its surrounding contract or convention.", "false": "The candidate is incidental, merely nearby, or does not help decide the rule."}}
	}
	return evaluationRequest{State: map[string]any{"evidenceCandidates": evidenceState(candidates)}, Model: model, Questions: questions}
}

func finalRequest(rule Rule, evidence []Evidence, model string) evaluationRequest {
	return evaluationRequest{State: map[string]any{"evidence": evidenceState(evidence)}, Model: model, Questions: map[string]question{rule.ID: {Type: "noul", Instructions: map[string]any{"task": "Does the identified candidate violate the supplied semantic lint rule?", "rule": ruleQuestionState(rule), "guidance": "Judge only the identified candidate. Use the supplied repository and change evidence when the rule requires comparison. The caller handles applicability and evidence sufficiency before asking this question."}, Criteria: map[string]any{"true": "The candidate contains a concrete violation supported by the supplied evidence.", "false": "The supplied evidence shows no concrete violation in the candidate."}}}}
}

func fitFinalEvidence(rule Rule, evidence []Evidence, model string) []Evidence {
	for length := len(evidence); length > 0; length-- {
		if requestSize(finalRequest(rule, evidence[:length], model)) <= maximumRequestBytes {
			return evidence[:length]
		}
	}
	return nil
}

func evidenceState(evidence []Evidence) []map[string]any {
	copyOfEvidence := append([]Evidence{}, evidence...)
	sort.SliceStable(copyOfEvidence, func(i, j int) bool {
		left, right := copyOfEvidence[i], copyOfEvidence[j]
		return left.ID < right.ID || (left.ID == right.ID && (left.Path < right.Path || (left.Path == right.Path && left.StartLine < right.StartLine)))
	})
	result := make([]map[string]any, len(copyOfEvidence))
	for index, item := range copyOfEvidence {
		result[index] = map[string]any{"id": nullableString(item.ID), "kind": nullableString(item.Kind), "relation": nullableString(item.Relation), "path": item.Path, "startLine": nullableInt(item.StartLine), "endLine": nullableInt(item.EndLine), "snippet": nullableString(item.Snippet)}
	}
	return result
}

func ruleQuestionState(rule Rule) map[string]any {
	return map[string]any{"source": rule.Path, "definition": rule.Definition, "scope": rule.Metadata.Scope, "requiredEvidence": rule.Metadata.RequiredEvidence}
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
	encoded, _ := json.Marshal(request)
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

func mergeUsage(fallback string, usages ...routingUsage) routingUsage {
	result := routingUsage{model: fallback}
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
	lower := strings.ToLower(filepath.ToSlash(name))
	base := path.Base(lower)
	if regexp.MustCompile(`(^|/)(__tests__|tests?|fixtures?)(/|$)`).MatchString(lower) || regexp.MustCompile(`\.(test|spec)\.[^.]+$`).MatchString(base) {
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
		if hunk.Header != "" && len(headers) < 4 {
			headers = append(headers, hunk.Header)
		}
	}
	if len(headers) == 0 {
		return file.Status + " " + file.Path
	}
	return file.Status + " " + file.Path + "; " + strings.Join(headers, "; ")
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

func importSpecifiers(source Source) []string {
	if !codeExtensions[path.Ext(source.Path)] {
		return nil
	}
	var result []string
	for _, pattern := range importPatterns {
		for _, match := range pattern.FindAllStringSubmatch(source.Text, -1) {
			if len(match) > 1 && !contains(result, match[1]) {
				result = append(result, match[1])
			}
		}
	}
	return result
}

func resolvedRelativeImport(sourcePath, specifier string, sources map[string]Source) string {
	if !strings.HasPrefix(specifier, ".") {
		return ""
	}
	base := path.Clean(path.Join(path.Dir(sourcePath), specifier))
	candidates := []string{base}
	for extension := range codeExtensions {
		candidates = append(candidates, base+extension)
	}
	for extension := range codeExtensions {
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
