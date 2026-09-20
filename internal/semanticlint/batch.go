package semanticlint

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"sync"
	"time"
)

type pendingEvaluation struct {
	ctx     context.Context
	request evaluationRequest
	result  chan evaluationResult
}

type evaluationResult struct {
	response evaluationResponse
	err      error
}

type batchMember struct {
	pending   *pendingEvaluation
	answerIDs map[string]string
}

type requestBatch struct {
	request evaluationRequest
	members []batchMember
}

type batchedEvaluator struct {
	delegate            evaluator
	maximumRequestBytes int
	mu                  sync.Mutex
	pending             []*pendingEvaluation
	timer               *time.Timer
}

func newBatchedEvaluator(delegate evaluator, maximumRequestBytes int) evaluator {
	return &batchedEvaluator{
		delegate:            delegate,
		maximumRequestBytes: maximumRequestBytes,
	}
}

func (batcher *batchedEvaluator) Evaluate(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
	pending := &pendingEvaluation{ctx: ctx, request: request, result: make(chan evaluationResult, 1)}
	batcher.mu.Lock()
	batcher.pending = append(batcher.pending, pending)
	if batcher.timer == nil {
		batcher.timer = time.AfterFunc(time.Millisecond, batcher.flush)
	}
	batcher.mu.Unlock()
	select {
	case result := <-pending.result:
		return result.response, result.err
	case <-ctx.Done():
		return evaluationResponse{}, ctx.Err()
	}
}

func (batcher *batchedEvaluator) flush() {
	batcher.mu.Lock()
	pending := batcher.pending
	batcher.pending = nil
	batcher.timer = nil
	batcher.mu.Unlock()

	groups := make(map[string][]*pendingEvaluation)
	var order []string
	for _, item := range pending {
		state, _ := json.Marshal(item.request.State)
		key := item.request.Model + "\x00" + string(state)
		if _, exists := groups[key]; !exists {
			order = append(order, key)
		}
		groups[key] = append(groups[key], item)
	}
	var workers sync.WaitGroup
	for _, key := range order {
		batches, oversized := buildRequestBatches(groups[key], batcher.maximumRequestBytes)
		for _, item := range oversized {
			item.result <- evaluationResult{err: fmt.Errorf("TypeSafe request exceeds %d bytes.", batcher.maximumRequestBytes)}
		}
		for _, batch := range batches {
			workers.Add(1)
			go func() {
				defer workers.Done()
				batcher.runBatch(batch)
			}()
		}
	}
	workers.Wait()
}

func buildRequestBatches(group []*pendingEvaluation, maximumRequestBytes int) ([]requestBatch, []*pendingEvaluation) {
	var batches []requestBatch
	var oversized []*pendingEvaluation
	var current []*pendingEvaluation
	for _, item := range group {
		candidate := makeRequestBatch(append(append([]*pendingEvaluation{}, current...), item))
		if requestSize(candidate.request) <= maximumRequestBytes {
			current = append(current, item)
			continue
		}
		if len(current) > 0 {
			batches = append(batches, makeRequestBatch(current))
		}
		single := makeRequestBatch([]*pendingEvaluation{item})
		if requestSize(single.request) > maximumRequestBytes {
			oversized = append(oversized, item)
			current = nil
		} else {
			current = []*pendingEvaluation{item}
		}
	}
	if len(current) > 0 {
		batches = append(batches, makeRequestBatch(current))
	}
	return batches, oversized
}

func makeRequestBatch(pending []*pendingEvaluation) requestBatch {
	first := pending[0]
	if len(pending) == 1 {
		answerIDs := make(map[string]string, len(first.request.Questions))
		for id := range first.request.Questions {
			answerIDs[id] = id
		}
		return requestBatch{request: first.request, members: []batchMember{{pending: first, answerIDs: answerIDs}}}
	}
	questions := make(map[string]question)
	var questionOrder []string
	members := make([]batchMember, len(pending))
	next := 1
	for index, item := range pending {
		answerIDs := make(map[string]string, len(item.request.Questions))
		for _, answerID := range orderedQuestionIDs(item.request) {
			batchID := fmt.Sprintf("q%d", next)
			next++
			questions[batchID] = item.request.Questions[answerID]
			questionOrder = append(questionOrder, batchID)
			answerIDs[answerID] = batchID
		}
		members[index] = batchMember{pending: item, answerIDs: answerIDs}
	}
	return requestBatch{request: evaluationRequest{State: first.request.State, Model: first.request.Model, Questions: questions, QuestionOrder: questionOrder}, members: members}
}

func orderedQuestionIDs(request evaluationRequest) []string {
	ids := append([]string{}, request.QuestionOrder...)
	seen := make(map[string]bool, len(ids))
	for _, id := range ids {
		seen[id] = true
	}
	var remaining []string
	for id := range request.Questions {
		if !seen[id] {
			remaining = append(remaining, id)
		}
	}
	sort.Strings(remaining)
	return append(ids, remaining...)
}

func (batcher *batchedEvaluator) runBatch(batch requestBatch) {
	ctx := batch.members[0].pending.ctx
	response, err := batcher.delegate.Evaluate(ctx, batch.request)
	if err != nil {
		for _, member := range batch.members {
			member.pending.result <- evaluationResult{err: err}
		}
		return
	}
	partition := response.Partition
	if partition == "" {
		partition = evaluationHash(batch.request)
	}
	for index, member := range batch.members {
		answers := make(map[string]answer, len(member.answerIDs))
		for answerID, batchID := range member.answerIDs {
			if answer, ok := response.Answers[batchID]; ok {
				answers[answerID] = answer
			}
		}
		member.pending.result <- evaluationResult{response: evaluationResponse{
			Model:     response.Model,
			Answers:   answers,
			Partition: partition,
			Usage: Usage{
				InputTokens:  tokenShare(response.Usage.InputTokens, index, len(batch.members)),
				OutputTokens: tokenShare(response.Usage.OutputTokens, index, len(batch.members)),
			},
		}}
	}
}

func tokenShare(total, index, count int) int {
	share := total / count
	if index < total%count {
		share++
	}
	return share
}
