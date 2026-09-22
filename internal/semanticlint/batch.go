package semanticlint

import (
	"context"
	"fmt"
	"sync"
)

const ruleQuestionPrefix = "Does the `file` violate the following rule?\n\nRule:\n"

type requestPartition struct {
	request evaluationRequest
	rules   []Rule
}

type partitionResult struct {
	response evaluationResponse
	err      error
}

func questionForRule(rule Rule) question {
	return question{Type: "noul", Instructions: ruleQuestionPrefix + rule.Source}
}

func buildRequestPartitions(source Source, rules []Rule, model string, maximumBytes int) ([]requestPartition, error) {
	model = modelOrDefault(model)
	state := map[string]string{"file": source.Text}
	var partitions []requestPartition
	current := requestPartition{request: evaluationRequest{State: state, Questions: map[string]question{}, Model: model}}
	for _, rule := range rules {
		candidateQuestions := cloneQuestions(current.request.Questions, 1)
		candidateQuestions[rule.ID] = questionForRule(rule)
		candidate := evaluationRequest{State: state, Questions: candidateQuestions, Model: model}
		if requestSize(candidate) <= maximumBytes {
			current.request = candidate
			current.rules = append(current.rules, rule)
			continue
		}
		if len(current.rules) > 0 {
			partitions = append(partitions, current)
		}
		single := evaluationRequest{State: state, Questions: map[string]question{rule.ID: questionForRule(rule)}, Model: model}
		if requestSize(single) > maximumBytes {
			return nil, fmt.Errorf("whole file %s with rule %s exceeds the %d-byte TypeSafe request limit", source.Path, rule.Path, maximumBytes)
		}
		current = requestPartition{request: single, rules: []Rule{rule}}
	}
	if len(current.rules) > 0 {
		partitions = append(partitions, current)
	}
	return partitions, nil
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
	var workers sync.WaitGroup
	for index, partition := range partitions {
		workers.Add(1)
		go func() {
			defer workers.Done()
			results[index].response, results[index].err = evaluator.Evaluate(ctx, partition.request)
		}()
	}
	workers.Wait()

	report := FindingReport{Source: source.Path, ViolationProbabilityThreshold: options.Threshold, Findings: []Finding{}}
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
			classification := classifyProbability(answer.Noul, options.Threshold)
			report.Findings = append(report.Findings, Finding{
				RulePath: rule.Path, RuleTitle: rule.Title,
				Classification:       classification,
				Message:              messageForClassification(classification),
				ViolationProbability: answer.Noul,
			})
		}
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
		result.Partitions[index] = DryRunPartition{Rules: paths, QuestionCount: len(paths), RequestBytes: requestSize(partition.request)}
	}
	return result, nil
}
