package semanticlint

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"unicode/utf8"
)

const (
	candidateQuestionPrefix         = "Could the `file` segment provide concrete evidence that the complete file violates the following rule? Answer yes for plausible evidence or necessary context, not merely related code. Answer no if the rule cannot apply to this segment.\n\nRule:\n"
	finalQuestionPrefix             = "Do the selected source spans in `file` provide enough evidence to conclude that the original file violates the following rule? Answer no if omitted context is needed; do not infer missing code.\n\nRule:\n"
	applicabilityQuestionPrefix     = "Does this policy apply to the behavior actually present in `file`? Answer yes only if the selected source spans establish the subject governed by the rule. Answer no when the source is merely related or the rule's subject is absent. Do not infer missing behavior or configuration.\n\nRule:\n"
	candidateSelectionThreshold     = 0.4
	minimumApplicabilityProbability = 0.7
	maximumSegmentBytes             = 4_000
	maximumWindowOverlapBytes       = 2_000
	maximumConcurrentEvaluations    = 8
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

func questionForCandidate(rule Rule) question {
	return question{Type: "noul", Instructions: candidateQuestionPrefix + rule.Source}
}

func questionForFinal(rule Rule) question {
	return question{Type: "noul", Instructions: finalQuestionPrefix + rule.Source}
}

func applicabilityQuestion(rule Rule) question {
	return question{Type: "noul", Instructions: applicabilityQuestionPrefix + rule.Source}
}

func buildRequestPartitions(source Source, rules []Rule, model string, maximumBytes int) ([]requestPartition, error) {
	if len(rules) == 0 {
		return nil, nil
	}
	model = modelOrDefault(model)
	windows, err := sourceWindows(source, rules, model, maximumBytes)
	if err != nil {
		return nil, err
	}
	var partitions []requestPartition
	for _, window := range windows {
		windowPartitions, err := partitionWindow(source, window, rules, model, maximumBytes, len(windows) > 1)
		if err != nil {
			return nil, err
		}
		partitions = append(partitions, windowPartitions...)
	}
	return partitions, nil
}

func singleRuleRequest(sourceText string, rule Rule, model string) evaluationRequest {
	return evaluationRequest{
		State:     map[string]string{"file": sourceText},
		Questions: map[string]question{rule.ID: questionForCandidate(rule)},
		Model:     model,
	}
}

func partitionWindow(source Source, window sourceWindow, rules []Rule, model string, maximumBytes int, windowed bool) ([]requestPartition, error) {
	state := map[string]string{"file": source.Text[window.start:window.end]}
	var partitions []requestPartition
	current := requestPartition{
		request:  evaluationRequest{State: state, Questions: make(map[string]question, len(rules)), Model: model},
		window:   window,
		windowed: windowed,
	}
	for _, rule := range rules {
		ruleQuestion := questionForCandidate(rule)
		current.request.Questions[rule.ID] = ruleQuestion
		if requestSize(current.request) <= maximumBytes {
			current.rules = append(current.rules, rule)
			continue
		}
		delete(current.request.Questions, rule.ID)
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
	largestEmptyRequest := requestSize(singleRuleRequest("", largestRule, model))
	for _, rule := range rules[1:] {
		size := requestSize(singleRuleRequest("", rule, model))
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

	contentBudget := min(maximumSegmentBytes, maximumBytes-largestEmptyRequest)
	var windows []sourceWindow
	for start := 0; start < len(source.Text); {
		end := encodedPrefixEnd(source.Text, start, contentBudget)
		if end < len(source.Text) {
			end = preferLineEnd(source.Text, start, end)
		}
		for end > start && requestSize(singleRuleRequest(source.Text[start:end], largestRule, model)) > maximumBytes {
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

func requestSize(request evaluationRequest) int {
	encoded, err := marshalJSON(request)
	if err != nil {
		return maximumRequestBytes + 1
	}
	return len(encoded)
}

func evaluatePartitions(ctx context.Context, partitions []requestPartition, evaluator evaluator) []partitionResult {
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
	return results
}

func addResponse(report *FindingReport, sourcePath string, result partitionResult, index int) error {
	if result.err != nil {
		return fmt.Errorf("evaluate %s partition %d: %w", sourcePath, index+1, result.err)
	}
	if report.Model == "" {
		report.Model = result.response.Model
	} else if report.Model != result.response.Model {
		return fmt.Errorf("TypeSafe returned inconsistent models for %s", sourcePath)
	}
	report.Usage.InputTokens += result.response.Usage.InputTokens
	report.Usage.OutputTokens += result.response.Usage.OutputTokens
	return nil
}

func probabilityForRule(response evaluationResponse, rule Rule) (float64, error) {
	answer, ok := response.Answers[rule.ID]
	if !ok {
		return 0, fmt.Errorf("TypeSafe omitted answer for %s", rule.Path)
	}
	if answer.Type != "noul" || !validProbability(answer.Noul) {
		return 0, fmt.Errorf("TypeSafe returned an invalid Noul answer for %s", rule.Path)
	}
	return answer.Noul, nil
}

func mergeCandidate(windows []sourceWindow, candidate sourceWindow) []sourceWindow {
	if len(windows) > 0 && candidate.start <= windows[len(windows)-1].end {
		windows[len(windows)-1].end = max(windows[len(windows)-1].end, candidate.end)
		return windows
	}
	return append(windows, candidate)
}

func candidateRanges(source Source, windows []sourceWindow) []CandidateRange {
	ranges := make([]CandidateRange, 0, len(windows))
	line, cursor := 1, 0
	for _, window := range windows {
		line += strings.Count(source.Text[cursor:window.start], "\n")
		endLine := line + strings.Count(source.Text[window.start:max(window.start, window.end-1)], "\n")
		ranges = append(ranges, CandidateRange{StartByte: window.start, EndByte: window.end, StartLine: line, EndLine: endLine})
		line += strings.Count(source.Text[window.start:window.end], "\n")
		cursor = window.end
	}
	return ranges
}

func finalRequest(source Source, rule Rule, windows []sourceWindow, ranges []CandidateRange, model string) evaluationRequest {
	var text strings.Builder
	for index, window := range windows {
		if index > 0 {
			text.WriteString("\n")
		}
		fmt.Fprintf(&text, "[source lines %d-%d]\n", ranges[index].StartLine, ranges[index].EndLine)
		text.WriteString(source.Text[window.start:window.end])
	}
	return evaluationRequest{
		State: map[string]string{"file": text.String()},
		Questions: map[string]question{
			rule.ID:              questionForFinal(rule),
			rule.ID + "_applies": applicabilityQuestion(rule),
		},
		Model: modelOrDefault(model),
	}
}

func evaluateSource(ctx context.Context, source Source, rules []Rule, options Options, evaluator evaluator) (FindingReport, error) {
	partitions, err := buildRequestPartitions(source, rules, options.Model, maximumRequestBytes)
	if err != nil {
		return FindingReport{}, err
	}
	report := FindingReport{Source: source.Path, ViolationProbabilityThreshold: options.Threshold, Findings: make([]Finding, 0, len(rules))}
	selected := make(map[string][]sourceWindow, len(rules))
	for index, result := range evaluatePartitions(ctx, partitions, evaluator) {
		if err := addResponse(&report, source.Path, result, index); err != nil {
			return FindingReport{}, err
		}
		for _, rule := range partitions[index].rules {
			probability, err := probabilityForRule(result.response, rule)
			if err != nil {
				return FindingReport{}, err
			}
			if probability > candidateSelectionThreshold {
				selected[rule.ID] = mergeCandidate(selected[rule.ID], partitions[index].window)
			}
		}
	}

	finalPartitions := make([]requestPartition, 0, len(rules))
	finalIndexes := make(map[string]int, len(rules))
	for _, rule := range rules {
		finding := Finding{RulePath: rule.Path, RuleTitle: rule.Title}
		windows := selected[rule.ID]
		if len(windows) == 0 {
			finding.Classification = "inconclusive"
			finding.Reason = "no candidate evidence selected"
		} else {
			finding.CandidateRanges = candidateRanges(source, windows)
			selectedBytes := 0
			for _, candidate := range finding.CandidateRanges {
				selectedBytes += candidate.EndByte - candidate.StartByte
			}
			var request evaluationRequest
			if selectedBytes < maximumRequestBytes {
				request = finalRequest(source, rule, windows, finding.CandidateRanges, options.Model)
			}
			if selectedBytes >= maximumRequestBytes || requestSize(request) > maximumRequestBytes {
				finding.Classification = "inconclusive"
				finding.Reason = "selected context exceeds the TypeSafe request limit"
			} else {
				finalIndexes[rule.ID] = len(report.Findings)
				finalPartitions = append(finalPartitions, requestPartition{request: request, rules: []Rule{rule}})
			}
		}
		report.Findings = append(report.Findings, finding)
	}
	for index, result := range evaluatePartitions(ctx, finalPartitions, evaluator) {
		if err := addResponse(&report, source.Path, result, index); err != nil {
			return FindingReport{}, err
		}
		rule := finalPartitions[index].rules[0]
		probability, err := probabilityForRule(result.response, rule)
		if err != nil {
			return FindingReport{}, err
		}
		applicability, err := probabilityForRule(result.response, Rule{ID: rule.ID + "_applies", Path: rule.Path})
		if err != nil {
			return FindingReport{}, err
		}
		finding := &report.Findings[finalIndexes[rule.ID]]
		finding.ApplicabilityProbability = &applicability
		if probability > maximumPassProbability && applicability < minimumApplicabilityProbability {
			finding.Classification = "inconclusive"
			finding.Reason = "policy applicability not established"
			continue
		}
		finding.ViolationProbability = &probability
		finding.Classification = classifyProbability(probability, options.Threshold)
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
