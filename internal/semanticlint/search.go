package semanticlint

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// minimumBlockBytes sets evidence granularity: blocks hold whole lines and at least this many bytes.
const minimumBlockBytes = 400

// evidenceBlocks splits a window into consecutive whole-line blocks of at least minimumBlockBytes.
func evidenceBlocks(text string, window sourceWindow) []sourceWindow {
	var blocks []sourceWindow
	for start := window.start; start < window.end; {
		end := min(window.end, start+minimumBlockBytes)
		if newline := strings.IndexByte(text[end:window.end], '\n'); newline >= 0 {
			end += newline + 1
		} else {
			end = window.end
		}
		blocks = append(blocks, sourceWindow{start: start, end: end})
		start = end
	}
	return blocks
}

func blockKey(position int) string {
	return "block_" + strconv.Itoa(position+1)
}

// evidenceRequest states the policy once and asks one short Noul per block.
func evidenceRequest(source Source, rule Rule, blocks []sourceWindow, settings requestSettings) evaluationRequest {
	state := make(map[string]string, len(blocks)+2)
	state["path"], state["policy"] = source.Path, rule.Source
	questions := make(map[string]question, len(blocks))
	for position, block := range blocks {
		key := blockKey(position)
		state[key] = source.Text[block.start:block.end]
		questions[key] = settings.prompts.evidenceQuestion(key)
	}
	return evaluationRequest{State: state, Questions: questions, Model: settings.model}
}

// selectEvidence keeps the blocks of each policy's candidate spans that could support a verdict.
// Every policy's block questions go out in one round. A span of one block is already as narrow as
// evidence gets, and a block too large to ask about stays whole.
func selectEvidence(ctx context.Context, source Source, rules []Rule, candidates map[string][]sourceWindow, settings requestSettings, evaluator evaluator, report *FindingReport) (map[string][]sourceWindow, error) {
	selected := make(map[string][]sourceWindow, len(candidates))
	var partitions []requestPartition
	for _, rule := range rules {
		var pending []sourceWindow
		for _, span := range candidates[rule.ID] {
			if blocks := evidenceBlocks(source.Text, span); len(blocks) == 1 {
				selected[rule.ID] = append(selected[rule.ID], blocks[0])
			} else {
				pending = append(pending, blocks...)
			}
		}
		for len(pending) > 0 {
			count := 1
			for count < len(pending) && requestSize(evidenceRequest(source, rule, pending[:count+1], settings)) <= maximumRequestBytes {
				count++
			}
			request := evidenceRequest(source, rule, pending[:count], settings)
			if requestSize(request) > maximumRequestBytes {
				selected[rule.ID] = append(selected[rule.ID], pending[0])
				pending = pending[1:]
				continue
			}
			partitions = append(partitions, requestPartition{request: request, rules: []Rule{rule}, blocks: pending[:count]})
			pending = pending[count:]
		}
	}
	for index, result := range evaluatePartitions(ctx, report.nextRound(stageEvidence), partitions, evaluator) {
		if err := addResponse(report, source.Path, result, index); err != nil {
			return nil, err
		}
		rule := partitions[index].rules[0]
		for position, block := range partitions[index].blocks {
			answer, ok := result.response.Answers[blockKey(position)]
			if !ok || answer.Type != "noul" || !validProbability(answer.Noul) {
				return nil, fmt.Errorf("TypeSafe omitted an evidence answer for %s", rule.Path)
			}
			if answer.Noul > candidateSelectionThreshold {
				selected[rule.ID] = append(selected[rule.ID], block)
			}
		}
	}
	for id, blocks := range selected {
		selected[id] = mergeWindows(blocks)
	}
	return selected, nil
}

// mergeWindows sorts windows and merges overlapping or adjacent ones; it reorders its argument.
func mergeWindows(windows []sourceWindow) []sourceWindow {
	sort.Slice(windows, func(i, j int) bool { return windows[i].start < windows[j].start })
	var merged []sourceWindow
	for _, window := range windows {
		merged = mergeCandidate(merged, window)
	}
	return merged
}
