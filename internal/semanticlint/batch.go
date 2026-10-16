package semanticlint

import (
	"context"
	"fmt"
	"math"
	"slices"
	"strings"
	"sync"
	"unicode/utf8"
)

const (
	candidateSelectionThreshold     = 0.4
	minimumApplicabilityProbability = 0.7
	maximumSegmentBytes             = 4_000
	maximumConcurrentEvaluations    = 8
	applicabilityGateReason         = "policy applicability not established"
	noCandidateReason               = "no candidate evidence selected"
	// Identical final requests vary by about ±0.05, so scores this close to the threshold are
	// averaged over marginSamples answers before classification.
	thresholdMargin = 0.05
	marginSamples   = 5
)

// stage names the pipeline step that issued a request.
type stage string

const (
	stageCandidate stage = "candidate"
	stageEvidence  stage = "evidence"
	stageFinal     stage = "final"
)

// requestScope identifies a request's stage, its round of concurrent requests within one file, and
// the source window or evidence blocks it judges.
type requestScope struct {
	stage  stage
	round  int
	window sourceWindow
	blocks []sourceWindow
}

type sourceWindow struct {
	start int
	end   int
}

type requestPartition struct {
	request  evaluationRequest
	rules    []Rule
	window   sourceWindow
	windowed bool
	blocks   []sourceWindow
}

type partitionResult struct {
	response evaluationResponse
	err      error
}

func buildRequestPartitions(source Source, rules []Rule, settings requestSettings, maximumBytes int) ([]requestPartition, error) {
	if len(rules) == 0 {
		return nil, nil
	}
	windows, err := sourceWindows(source, rules, settings, maximumBytes)
	if err != nil {
		return nil, err
	}
	var partitions []requestPartition
	for _, window := range windows {
		windowPartitions, err := partitionWindow(source, window, rules, settings, maximumBytes, len(windows) > 1)
		if err != nil {
			return nil, err
		}
		partitions = append(partitions, windowPartitions...)
	}
	return partitions, nil
}

func singleRuleRequest(path, sourceText string, rule Rule, settings requestSettings) evaluationRequest {
	return evaluationRequest{
		State:     candidateState(path, sourceText, settings),
		Questions: map[string]question{rule.ID: settings.prompts.candidateQuestion(rule)},
		Model:     settings.model,
	}
}

// candidateState holds the selection guide once, so each policy's question only points at it.
func candidateState(path, sourceText string, settings requestSettings) map[string]string {
	return map[string]string{"path": path, "file": sourceText, "selection_guide": settings.prompts.CandidateGuide}
}

func partitionWindow(source Source, window sourceWindow, rules []Rule, settings requestSettings, maximumBytes int, windowed bool) ([]requestPartition, error) {
	state := candidateState(source.Path, source.Text[window.start:window.end], settings)
	var partitions []requestPartition
	current := requestPartition{
		request:  evaluationRequest{State: state, Questions: make(map[string]question, len(rules)), Model: settings.model},
		window:   window,
		windowed: windowed,
	}
	for _, rule := range rules {
		ruleQuestion := settings.prompts.candidateQuestion(rule)
		current.request.Questions[rule.ID] = ruleQuestion
		if requestSize(current.request) <= maximumBytes {
			current.rules = append(current.rules, rule)
			continue
		}
		delete(current.request.Questions, rule.ID)
		if len(current.rules) > 0 {
			partitions = append(partitions, current)
		}
		single := evaluationRequest{State: state, Questions: map[string]question{rule.ID: ruleQuestion}, Model: settings.model}
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

func sourceWindows(source Source, rules []Rule, settings requestSettings, maximumBytes int) ([]sourceWindow, error) {
	largestRule := rules[0]
	largestEmptyRequest := requestSize(singleRuleRequest(source.Path, "", largestRule, settings))
	for _, rule := range rules[1:] {
		size := requestSize(singleRuleRequest(source.Path, "", rule, settings))
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
		for end > start && requestSize(singleRuleRequest(source.Path, source.Text[start:end], largestRule, settings)) > maximumBytes {
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

// nextWindowStart overlaps consecutive spans by a quarter of a span, 1,000 bytes at most.
func nextWindowStart(text string, start, end int) int {
	overlap := (end - start) / 4
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

// nextRound scopes the next wave of concurrent requests for this file; evals count waves as latency.
func (report *FindingReport) nextRound(step stage) requestScope {
	report.rounds++
	return requestScope{stage: step, round: report.rounds}
}

func evaluatePartitions(ctx context.Context, scope requestScope, partitions []requestPartition, evaluator evaluator) []partitionResult {
	results := make([]partitionResult, len(partitions))
	jobs := make(chan int)
	var workers sync.WaitGroup
	for range min(maximumConcurrentEvaluations, len(partitions)) {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for index := range jobs {
				request := partitions[index].request
				request.scope = scope
				request.scope.window, request.scope.blocks = partitions[index].window, partitions[index].blocks
				results[index].response, results[index].err = evaluator.Evaluate(ctx, request)
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

func finalRequest(source Source, rule Rule, windows []sourceWindow, ranges []CandidateRange, settings requestSettings) evaluationRequest {
	var text strings.Builder
	for index, window := range windows {
		if index > 0 {
			text.WriteString("\n")
		}
		fmt.Fprintf(&text, "[source lines %d-%d]\n", ranges[index].StartLine, ranges[index].EndLine)
		text.WriteString(source.Text[window.start:window.end])
	}
	return evaluationRequest{
		State: map[string]string{"path": source.Path, "file": text.String()},
		Questions: map[string]question{
			rule.ID:              settings.prompts.finalQuestion(rule),
			rule.ID + "_applies": settings.prompts.applicabilityQuestion(rule),
		},
		Model: settings.model,
	}
}

func evaluateSource(ctx context.Context, source Source, rules []Rule, options Options, evaluator evaluator) (FindingReport, error) {
	settings := options.requestSettings()
	partitions, err := buildRequestPartitions(source, rules, settings, maximumRequestBytes)
	if err != nil {
		return FindingReport{}, err
	}
	report := FindingReport{Source: source.Path, ViolationProbabilityThreshold: options.Threshold, Findings: make([]Finding, 0, len(rules))}
	selected := make(map[string][]sourceWindow, len(rules))
	for index, result := range evaluatePartitions(ctx, report.nextRound(stageCandidate), partitions, evaluator) {
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

	evidence, err := selectEvidence(ctx, source, rules, selected, settings, evaluator, &report)
	if err != nil {
		return FindingReport{}, err
	}
	var finalPartitions []requestPartition
	var findingIndexes []int
	for _, rule := range rules {
		finding := Finding{RulePath: rule.Path, RuleTitle: rule.Title}
		windows := evidence[rule.ID]
		switch {
		case len(selected[rule.ID]) == 0:
			finding.Classification = "pass"
			finding.Reason = noCandidateReason
		case len(windows) == 0:
			finding.Classification = "inconclusive"
			finding.Reason = "no evidence selected"
		default:
			finding.CandidateRanges = candidateRanges(source, windows)
			finding.EvidenceScope = "localized"
			if len(windows) == 1 && windows[0].start == 0 && windows[0].end == len(source.Text) {
				finding.EvidenceScope = "file"
			}
			chunks, err := finalChunks(source, rule, windows, settings, maximumRequestBytes)
			if err != nil {
				return FindingReport{}, err
			}
			for _, chunk := range chunks {
				findingIndexes = append(findingIndexes, len(report.Findings))
				finalPartitions = append(finalPartitions, requestPartition{request: finalRequest(source, rule, chunk, candidateRanges(source, chunk), settings), rules: []Rule{rule}})
			}
		}
		report.Findings = append(report.Findings, finding)
	}
	finalResults := evaluatePartitions(ctx, report.nextRound(stageFinal), finalPartitions, evaluator)
	scores := make([]finalScore, len(finalPartitions))
	var resamples []requestPartition
	var owners []int
	for index, result := range finalResults {
		if err := scores[index].add(&report, source.Path, result, index, finalPartitions[index].rules[0]); err != nil {
			return FindingReport{}, err
		}
		if math.Abs(scores[index].violation-options.Threshold) <= thresholdMargin+1e-9 {
			for range marginSamples - 1 {
				resamples = append(resamples, finalPartitions[index])
				owners = append(owners, index)
			}
		}
	}
	if len(resamples) > 0 {
		for index, result := range evaluatePartitions(ctx, report.nextRound(stageFinal), resamples, evaluator) {
			owner := owners[index]
			if err := scores[owner].add(&report, source.Path, result, owner, finalPartitions[owner].rules[0]); err != nil {
				return FindingReport{}, err
			}
		}
	}
	for index := range finalPartitions {
		probability, applicability := scores[index].mean()
		verdict := Finding{ApplicabilityProbability: &applicability}
		if probability > maximumPassProbability && applicability < minimumApplicabilityProbability {
			verdict.Classification, verdict.Reason = "inconclusive", applicabilityGateReason
		} else {
			verdict.ViolationProbability = &probability
			verdict.Classification = classifyProbability(probability, options.Threshold)
		}
		finding := &report.Findings[findingIndexes[index]]
		if finding.Classification == "" || moreSevere(verdict, *finding) {
			finding.Classification, finding.Reason = verdict.Classification, verdict.Reason
			finding.ViolationProbability, finding.ApplicabilityProbability = verdict.ViolationProbability, verdict.ApplicabilityProbability
		}
	}
	return report, nil
}

// finalChunks splits a policy's evidence set into groups that each fit one final request. A range
// too large for one request is cut, at a line end when possible; no source byte is dropped.
func finalChunks(source Source, rule Rule, windows []sourceWindow, settings requestSettings, maximumBytes int) ([][]sourceWindow, error) {
	fits := func(chunk []sourceWindow) bool {
		return requestSize(finalRequest(source, rule, chunk, candidateRanges(source, chunk), settings)) <= maximumBytes
	}
	budget := maximumBytes - requestSize(finalRequest(source, rule, nil, nil, settings))
	if budget <= 0 {
		return nil, fmt.Errorf("rule %s leaves no room for evidence within the %d-byte TypeSafe request limit", rule.Path, maximumBytes)
	}
	var chunks [][]sourceWindow
	var current []sourceWindow
	for _, window := range windows {
		for window.start < window.end {
			if fits(append(current[:len(current):len(current)], window)) {
				current = append(current, window)
				break
			}
			if len(current) > 0 {
				chunks, current = append(chunks, current), nil
				continue
			}
			end := min(encodedPrefixEnd(source.Text, window.start, budget), window.end)
			end = preferLineEnd(source.Text, window.start, end)
			for end > window.start && !fits([]sourceWindow{{start: window.start, end: end}}) {
				_, width := utf8.DecodeLastRuneInString(source.Text[window.start:end])
				end -= width
			}
			if end == window.start {
				return nil, fmt.Errorf("rule %s leaves no room for evidence within the %d-byte TypeSafe request limit", rule.Path, maximumBytes)
			}
			chunks = append(chunks, []sourceWindow{{start: window.start, end: end}})
			window.start = end
		}
	}
	if len(current) > 0 {
		chunks = append(chunks, current)
	}
	return chunks, nil
}

// moreSevere orders chunk verdicts by classification, then by violation probability.
func moreSevere(candidate, current Finding) bool {
	candidateRank, currentRank := slices.Index(classifications, candidate.Classification), slices.Index(classifications, current.Classification)
	if candidateRank != currentRank {
		return candidateRank < currentRank
	}
	return candidate.ViolationProbability != nil && current.ViolationProbability != nil && *candidate.ViolationProbability > *current.ViolationProbability
}

// finalScore sums the violation and applicability answers of one policy's final requests.
type finalScore struct {
	violation     float64
	applicability float64
	samples       int
}

func (score *finalScore) add(report *FindingReport, sourcePath string, result partitionResult, index int, rule Rule) error {
	if err := addResponse(report, sourcePath, result, index); err != nil {
		return err
	}
	violation, err := probabilityForRule(result.response, rule)
	if err != nil {
		return err
	}
	applicability, err := probabilityForRule(result.response, Rule{ID: rule.ID + "_applies", Path: rule.Path})
	if err != nil {
		return err
	}
	score.violation += violation
	score.applicability += applicability
	score.samples++
	return nil
}

// mean averages the answers, rounded to the model's two decimals so the shown score decides the class.
func (score finalScore) mean() (float64, float64) {
	if score.samples == 1 {
		return score.violation, score.applicability
	}
	count := float64(score.samples)
	return math.Round(score.violation/count*100) / 100, math.Round(score.applicability/count*100) / 100
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

func dryRunFile(source Source, rules []Rule, settings requestSettings) (DryRunFile, error) {
	partitions, err := buildRequestPartitions(source, rules, settings, maximumRequestBytes)
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
