package semanticlint

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"
)

const (
	minimumLeafBytes     = 400
	strongNeitherScore   = 0.8
	plausibleBranchRatio = 0.5
)

const routeQuestionPrefix = "Which parts of `left` and `right` might contain evidence or necessary context for deciding whether the original file violates this rule? Select both when the relationship between parts matters. Select neither only if neither part can contribute.\n\nRule:\n"

type branchPair struct {
	left  sourceWindow
	right sourceWindow
}

func routeRequest(source Source, rule Rule, pair branchPair, model string) evaluationRequest {
	return evaluationRequest{
		State: map[string]string{
			"path":  source.Path,
			"left":  source.Text[pair.left.start:pair.left.end],
			"right": source.Text[pair.right.start:pair.right.end],
		},
		Questions: map[string]question{rule.ID: {
			Type:         "choice",
			Instructions: routeQuestionPrefix + rule.Source,
			Criteria: map[string]string{
				"left":    "Only the left part may be relevant.",
				"right":   "Only the right part may be relevant.",
				"both":    "Both parts may be relevant, including jointly.",
				"neither": "Neither part can provide evidence or necessary context.",
			},
		}},
		Model: modelOrDefault(model),
	}
}

func splitWindow(text string, window sourceWindow) (branchPair, bool) {
	if window.end-window.start <= minimumLeafBytes {
		return branchPair{}, false
	}
	center := window.start + (window.end-window.start)/2
	split := center
	if offset := strings.IndexByte(text[center:window.end], '\n'); offset >= 0 && center+offset+1 < window.end {
		split = center + offset + 1
	} else if offset := strings.LastIndexByte(text[window.start:center], '\n'); offset >= 0 {
		split = window.start + offset + 1
	} else {
		for split > window.start && !utf8.RuneStart(text[split]) {
			split--
		}
	}
	if split <= window.start || split >= window.end {
		return branchPair{}, false
	}
	return branchPair{left: sourceWindow{start: window.start, end: split}, right: sourceWindow{start: split, end: window.end}}, true
}

func routeBranches(response evaluationResponse, rule Rule) (bool, bool, error) {
	result, ok := response.Answers[rule.ID]
	if !ok || result.Type != "choice" || len(result.Probabilities) != 4 {
		return false, false, fmt.Errorf("TypeSafe omitted a Choice answer for %s", rule.Path)
	}
	for _, name := range []string{"left", "right", "both", "neither"} {
		if !validProbability(result.Probabilities[name]) {
			return false, false, fmt.Errorf("TypeSafe returned an invalid Choice answer for %s", rule.Path)
		}
		if _, exists := result.Probabilities[name]; !exists {
			return false, false, fmt.Errorf("TypeSafe omitted Choice option %s for %s", name, rule.Path)
		}
	}
	if result.Probabilities["neither"] >= strongNeitherScore {
		return false, false, nil
	}
	left := result.Probabilities["left"] + result.Probabilities["both"]
	right := result.Probabilities["right"] + result.Probabilities["both"]
	if left == 0 && right == 0 {
		return false, false, nil
	}
	return left >= right*plausibleBranchRatio, right >= left*plausibleBranchRatio, nil
}

func selectEvidence(ctx context.Context, source Source, rule Rule, candidates []sourceWindow, model string, evaluator evaluator, report *FindingReport) ([]sourceWindow, error) {
	frontier := candidates
	var leaves []sourceWindow
	for len(frontier) > 0 {
		var partitions []requestPartition
		var pairs []branchPair
		for _, window := range frontier {
			if window.start == window.end {
				continue
			}
			pair, split := splitWindow(source.Text, window)
			if !split {
				leaves = append(leaves, window)
				continue
			}
			request := routeRequest(source, rule, pair, model)
			if requestSize(request) > maximumRequestBytes {
				leaves = append(leaves, window)
				continue
			}
			partitions = append(partitions, requestPartition{request: request, rules: []Rule{rule}})
			pairs = append(pairs, pair)
		}
		var next []sourceWindow
		for index, result := range evaluatePartitions(ctx, partitions, evaluator) {
			if err := addResponse(report, source.Path, result, index); err != nil {
				return nil, err
			}
			left, right, err := routeBranches(result.response, rule)
			if err != nil {
				return nil, err
			}
			if left {
				next = append(next, pairs[index].left)
			}
			if right {
				next = append(next, pairs[index].right)
			}
		}
		frontier = next
	}
	sort.Slice(leaves, func(i, j int) bool { return leaves[i].start < leaves[j].start })
	var selected []sourceWindow
	for _, leaf := range leaves {
		selected = mergeCandidate(selected, leaf)
	}
	return selected, nil
}
