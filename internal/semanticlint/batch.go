package semanticlint

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"unicode/utf8"
)

const (
	ruleQuestionPrefix           = "Does the `file` violate the following rule?\n\nRule:\n"
	windowRuleQuestionPrefix     = "Does the `file` fragment contain enough evidence to conclude that the complete file violates the following rule? Answer no when deciding would require omitted surrounding content.\n\nRule:\n"
	maximumWindowOverlapBytes    = 2_000
	maximumConcurrentEvaluations = 8
)

type sourceWindow struct {
	start int
	end   int
}

type requestPartition struct {
	request  evaluationRequest
	rules    []Rule
	window   sourceWindow
	windowed bool
}

type partitionResult struct {
	response evaluationResponse
	err      error
}

func questionForRule(rule Rule) question {
	return question{Type: "noul", Instructions: ruleQuestionPrefix + rule.Source}
}

func questionForWindowRule(rule Rule) question {
	return question{Type: "noul", Instructions: windowRuleQuestionPrefix + rule.Source}
}

func buildRequestPartitions(source Source, rules []Rule, model string, maximumBytes int) ([]requestPartition, error) {
	if len(rules) == 0 {
		return nil, nil
	}
	model = modelOrDefault(model)
	var wholeFileRules, windowRules []Rule
	emptyQuestionRequest := evaluationRequest{
		State:     map[string]string{"file": source.Text},
		Questions: map[string]question{},
		Model:     model,
	}
	if requestSize(emptyQuestionRequest) > maximumBytes {
		windowRules = append(windowRules, rules...)
	} else {
		for _, rule := range rules {
			if requestSize(singleRuleRequest(source.Text, rule, model, false)) <= maximumBytes {
				wholeFileRules = append(wholeFileRules, rule)
			} else {
				windowRules = append(windowRules, rule)
			}
		}
	}

	var partitions []requestPartition
	if len(wholeFileRules) > 0 {
		wholeFilePartitions, err := partitionWindow(source, sourceWindow{end: len(source.Text)}, wholeFileRules, model, maximumBytes, false)
		if err != nil {
			return nil, err
		}
		partitions = append(partitions, wholeFilePartitions...)
	}
	if len(windowRules) == 0 {
		return partitions, nil
	}

	windows, err := sourceWindows(source, windowRules, model, maximumBytes)
	if err != nil {
		return nil, err
	}
	for _, window := range windows {
		windowPartitions, err := partitionWindow(source, window, windowRules, model, maximumBytes, true)
		if err != nil {
			return nil, err
		}
		partitions = append(partitions, windowPartitions...)
	}
	return partitions, nil
}

func singleRuleRequest(sourceText string, rule Rule, model string, windowed bool) evaluationRequest {
	ruleQuestion := questionForRule(rule)
	if windowed {
		ruleQuestion = questionForWindowRule(rule)
	}
	return evaluationRequest{
		State:     map[string]string{"file": sourceText},
		Questions: map[string]question{rule.ID: ruleQuestion},
		Model:     model,
	}
}

func partitionWindow(source Source, window sourceWindow, rules []Rule, model string, maximumBytes int, windowed bool) ([]requestPartition, error) {
	state := map[string]string{"file": source.Text[window.start:window.end]}
	var partitions []requestPartition
	current := requestPartition{
		request:  evaluationRequest{State: state, Questions: map[string]question{}, Model: model},
		window:   window,
		windowed: windowed,
	}
	for _, rule := range rules {
		ruleQuestion := questionForRule(rule)
		if windowed {
			ruleQuestion = questionForWindowRule(rule)
		}
		candidateQuestions := cloneQuestions(current.request.Questions, 1)
		candidateQuestions[rule.ID] = ruleQuestion
		candidate := evaluationRequest{State: state, Questions: candidateQuestions, Model: model}
		if requestSize(candidate) <= maximumBytes {
			current.request = candidate
			current.rules = append(current.rules, rule)
			continue
		}
		if len(current.rules) > 0 {
			partitions = append(partitions, current)
		}
		single := evaluationRequest{State: state, Questions: map[string]question{rule.ID: ruleQuestion}, Model: model}
		if requestSize(single) > maximumBytes {
			return nil, fmt.Errorf("file %s bytes %d:%d with rule %s exceeds the %d-byte TypeSafe request limit", source.Path, window.start, window.end, rule.Path, maximumBytes)
		}
		current = requestPartition{request: single, rules: []Rule{rule}, window: window, windowed: windowed}
	}
	if len(current.rules) > 0 {
		partitions = append(partitions, current)
	}
	return partitions, nil
}

func sourceWindows(source Source, rules []Rule, model string, maximumBytes int) ([]sourceWindow, error) {
	largestRule := rules[0]
	largestEmptyRequest := requestSize(singleRuleRequest("", largestRule, model, true))
	for _, rule := range rules[1:] {
		size := requestSize(singleRuleRequest("", rule, model, true))
		if size > largestEmptyRequest {
			largestRule = rule
			largestEmptyRequest = size
		}
	}
	if largestEmptyRequest > maximumBytes || largestEmptyRequest == maximumBytes && source.Text != "" {
		return nil, fmt.Errorf("rule %s leaves no room for file content within the %d-byte TypeSafe request limit", largestRule.Path, maximumBytes)
	}
	if source.Text == "" {
		return []sourceWindow{{}}, nil
	}

	contentBudget := maximumBytes - largestEmptyRequest
	var windows []sourceWindow
	for start := 0; start < len(source.Text); {
		end := encodedPrefixEnd(source.Text, start, contentBudget)
		if end < len(source.Text) {
			end = preferLineEnd(source.Text, start, end)
		}
		for end > start && requestSize(singleRuleRequest(source.Text[start:end], largestRule, model, true)) > maximumBytes {
			_, width := utf8.DecodeLastRuneInString(source.Text[start:end])
			end -= width
		}
		if end == start {
			return nil, fmt.Errorf("rule %s leaves no room for file content within the %d-byte TypeSafe request limit", largestRule.Path, maximumBytes)
		}
		windows = append(windows, sourceWindow{start: start, end: end})
		if end == len(source.Text) {
			break
		}
		start = nextWindowStart(source.Text, start, end)
	}
	return windows, nil
}

func encodedPrefixEnd(text string, start, budget int) int {
	end := start
	used := 0
	for end < len(text) {
		size, width := encodedRuneSize(text[end:])
		if used+size > budget {
			break
		}
		used += size
		end += width
	}
	return end
}

func encodedRuneSize(text string) (int, int) {
	value, width := utf8.DecodeRuneInString(text)
	if value == utf8.RuneError && width == 1 {
		return len(string(utf8.RuneError)), width
	}
	switch value {
	case '"', '\\', '\b', '\f', '\n', '\r', '\t':
		return 2, width
	case '\u2028', '\u2029':
		return 6, width
	}
	if value < ' ' {
		return 6, width
	}
	return width, width
}

func preferLineEnd(text string, start, end int) int {
	lastNewline := strings.LastIndexByte(text[start:end], '\n')
	if lastNewline < 0 {
		return end
	}
	candidate := start + lastNewline + 1
	if candidate > start+(end-start)/2 {
		return candidate
	}
	return end
}

func nextWindowStart(text string, start, end int) int {
	overlap := min(maximumWindowOverlapBytes, (end-start)/4)
	if overlap == 0 {
		return end
	}
	target := end - overlap
	for target > start && !utf8.RuneStart(text[target]) {
		target--
	}
	if newline := strings.IndexByte(text[target:end], '\n'); newline >= 0 {
		candidate := target + newline + 1
		if candidate < end {
			return candidate
		}
	}
	if target > start {
		return target
	}
	return end
}

func cloneQuestions(source map[string]question, extra int) map[string]question {
	result := make(map[string]question, len(source)+extra)
	for id, value := range source {
		result[id] = value
	}
	return result
}

func requestSize(request evaluationRequest) int {
	encoded, err := marshalJSON(request)
	if err != nil {
		return maximumRequestBytes + 1
	}
	return len(encoded)
}

func evaluateSource(ctx context.Context, source Source, rules []Rule, options Options, evaluator evaluator) (FindingReport, error) {
	partitions, err := buildRequestPartitions(source, rules, options.Model, maximumRequestBytes)
	if err != nil {
		return FindingReport{}, err
	}
	results := make([]partitionResult, len(partitions))
	jobs := make(chan int)
	var workers sync.WaitGroup
	for range min(maximumConcurrentEvaluations, len(partitions)) {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for index := range jobs {
				results[index].response, results[index].err = evaluator.Evaluate(ctx, partitions[index].request)
			}
		}()
	}
	for index := range partitions {
		jobs <- index
	}
	close(jobs)
	workers.Wait()

	report := FindingReport{Source: source.Path, ViolationProbabilityThreshold: options.Threshold, Findings: []Finding{}}
	probabilities := make(map[string]float64, len(rules))
	answered := make(map[string]bool, len(rules))
	for index, result := range results {
		if result.err != nil {
			return FindingReport{}, fmt.Errorf("evaluate %s partition %d: %w", source.Path, index+1, result.err)
		}
		if report.Model == "" {
			report.Model = result.response.Model
		} else if report.Model != result.response.Model {
			return FindingReport{}, fmt.Errorf("TypeSafe returned inconsistent models for %s", source.Path)
		}
		report.Usage.InputTokens += result.response.Usage.InputTokens
		report.Usage.OutputTokens += result.response.Usage.OutputTokens
		for _, rule := range partitions[index].rules {
			answer, ok := result.response.Answers[rule.ID]
			if !ok {
				return FindingReport{}, fmt.Errorf("TypeSafe omitted answer for %s", rule.Path)
			}
			if answer.Type != "noul" || !validProbability(answer.Noul) {
				return FindingReport{}, fmt.Errorf("TypeSafe returned an invalid Noul answer for %s", rule.Path)
			}
			if !answered[rule.ID] || answer.Noul > probabilities[rule.ID] {
				probabilities[rule.ID] = answer.Noul
			}
			answered[rule.ID] = true
		}
	}
	for _, rule := range rules {
		probability, ok := probabilities[rule.ID]
		if !ok {
			return FindingReport{}, fmt.Errorf("TypeSafe omitted answer for %s", rule.Path)
		}
		classification := classifyProbability(probability, options.Threshold)
		report.Findings = append(report.Findings, Finding{
			RulePath: rule.Path, RuleTitle: rule.Title,
			Classification:       classification,
			Message:              messageForClassification(classification),
			ViolationProbability: probability,
		})
	}
	return report, nil
}

func classifyProbability(probability, threshold float64) string {
	if probability >= threshold {
		return "violation"
	}
	if probability > maximumPassProbability {
		return "review"
	}
	return "pass"
}

func messageForClassification(classification string) string {
	switch classification {
	case "violation":
		return "The file violates this rule."
	case "review":
		return "The file may violate this rule."
	default:
		return "The file does not violate this rule."
	}
}

func dryRunFile(source Source, rules []Rule, model string) (DryRunFile, error) {
	partitions, err := buildRequestPartitions(source, rules, model, maximumRequestBytes)
	if err != nil {
		return DryRunFile{}, err
	}
	result := DryRunFile{Path: source.Path, FileBytes: len(source.Text), Rules: make([]string, len(rules)), Partitions: make([]DryRunPartition, len(partitions))}
	for index, rule := range rules {
		result.Rules[index] = rule.Path
	}
	for index, partition := range partitions {
		paths := make([]string, len(partition.rules))
		for ruleIndex, rule := range partition.rules {
			paths[ruleIndex] = rule.Path
		}
		result.Partitions[index] = DryRunPartition{
			Rules:           paths,
			QuestionCount:   len(paths),
			RequestBytes:    requestSize(partition.request),
			Windowed:        partition.windowed,
			WindowStartByte: partition.window.start,
			WindowEndByte:   partition.window.end,
			WindowBytes:     partition.window.end - partition.window.start,
		}
	}
	return result, nil
}
