package semanticlint

import (
	"context"
	"fmt"
	"sort"
	"sync"
)

const maximumSpeculativeRouteConcurrency = 8

type routeNodeDefinition struct {
	id         string
	request    evaluationRequest
	childOrder []string
	children   map[string][]*routeNodeDefinition
}

type speculativeFuture struct {
	request evaluationRequest
	cancel  context.CancelFunc
	done    chan struct{}

	started  bool
	response evaluationResponse
	err      error
}

type speculativeRouteEvaluator struct {
	delegate evaluator
	roots    *routeNodeDefinition
	futures  map[string]*speculativeFuture
	sem      chan struct{}

	mu   sync.Mutex
	used map[string]bool
}

func interpretRoutePlanSpeculative(ctx context.Context, plan routePlan, model string, delegate evaluator) (routeExecution[routedHunk], error) {
	if err := validateRoutePlan(plan); err != nil {
		return routeExecution[routedHunk]{}, err
	}
	interpreter := newSpeculativeRouteEvaluator(ctx, plan, model, delegate)
	result, err := interpretRoutePlan(ctx, plan, model, interpreter)
	usage := interpreter.finish()
	if err != nil {
		return routeExecution[routedHunk]{}, err
	}
	result.usage = usage
	return result, nil
}

func newSpeculativeRouteEvaluator(ctx context.Context, plan routePlan, model string, delegate evaluator) *speculativeRouteEvaluator {
	root := routeDefinition(plan.rule, plan.domains, model, func(domain routeChoiceOption[routeDomain]) []*routeNodeDefinition {
		path := routeDefinition(plan.rule, domain.value.paths, model, func(path routeChoiceOption[routePath]) []*routeNodeDefinition {
			return []*routeNodeDefinition{routeDefinition(plan.rule, path.value.hunks, model, func(routeChoiceOption[routedHunk]) []*routeNodeDefinition { return nil })}
		})
		return []*routeNodeDefinition{path}
	})
	interpreter := &speculativeRouteEvaluator{
		delegate: delegate,
		roots:    root,
		futures:  make(map[string]*speculativeFuture),
		sem:      make(chan struct{}, maximumSpeculativeRouteConcurrency),
		used:     make(map[string]bool),
	}
	interpreter.start(ctx, root)
	return interpreter
}

func routeDefinition[T any](rule Rule, choice routeChoice[T], model string, leafChildren func(routeChoiceOption[T]) []*routeNodeDefinition) *routeNodeDefinition {
	definition := &routeNodeDefinition{id: choice.nodeID, children: make(map[string][]*routeNodeDefinition)}
	if request, evaluatable := routeChoiceRequest(rule, choice, model); evaluatable {
		definition.request = request
	}
	for _, option := range choice.options {
		definition.childOrder = append(definition.childOrder, option.id)
		if option.members != nil {
			definition.children[option.id] = []*routeNodeDefinition{routeDefinition(rule, *option.members, model, leafChildren)}
			continue
		}
		definition.children[option.id] = leafChildren(option)
	}
	return definition
}

func (interpreter *speculativeRouteEvaluator) start(ctx context.Context, definition *routeNodeDefinition) {
	if len(definition.request.Questions) > 0 {
		futureCtx, cancel := context.WithCancel(ctx)
		future := &speculativeFuture{request: definition.request, cancel: cancel, done: make(chan struct{})}
		interpreter.futures[definition.id] = future
		go func() {
			defer close(future.done)
			select {
			case interpreter.sem <- struct{}{}:
				future.started = true
				defer func() { <-interpreter.sem }()
			case <-futureCtx.Done():
				future.err = futureCtx.Err()
				return
			}
			future.response, future.err = interpreter.delegate.Evaluate(futureCtx, future.request)
		}()
	}
	for _, optionID := range definition.childOrder {
		for _, child := range definition.children[optionID] {
			interpreter.start(ctx, child)
		}
	}
}

func (interpreter *speculativeRouteEvaluator) Evaluate(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
	future, ok := interpreter.futures[request.Scope.NodeID]
	if !ok {
		return evaluationResponse{}, fmt.Errorf("speculative route node %s was not declared", request.Scope.NodeID)
	}
	select {
	case <-future.done:
	case <-ctx.Done():
		return evaluationResponse{}, ctx.Err()
	}
	interpreter.mu.Lock()
	interpreter.used[request.Scope.NodeID] = true
	interpreter.mu.Unlock()
	if future.err != nil {
		return evaluationResponse{}, future.err
	}
	interpreter.cancelRejectedBranches(request.Scope.NodeID, request, future.response)
	return future.response, nil
}

func (interpreter *speculativeRouteEvaluator) cancelRejectedBranches(nodeID string, request evaluationRequest, response evaluationResponse) {
	definition := findRouteDefinition(interpreter.roots, nodeID)
	if definition == nil {
		return
	}
	answer, ok := response.Answers["route"]
	if !ok || answer.Type != "choice" {
		return
	}
	selected := selectedRouteOptions(request, answer)
	for _, optionID := range definition.childOrder {
		if selected[optionID] {
			continue
		}
		for _, child := range definition.children[optionID] {
			interpreter.cancel(child)
		}
	}
}

func selectedRouteOptions(request evaluationRequest, value answer) map[string]bool {
	var candidateIDs []string
	if state, ok := request.State.(choiceState); ok {
		candidateIDs = state.CandidateIDs
	}
	type candidate struct {
		id          string
		probability float64
	}
	ranked := make([]candidate, len(candidateIDs))
	for index, id := range candidateIDs {
		ranked[index] = candidate{id: id, probability: value.Probabilities[id]}
	}
	sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].probability > ranked[j].probability })
	selected := make(map[string]bool)
	if value.Choice == "none" {
		return selected
	}
	selected[value.Choice] = true
	noneProbability := value.Probabilities["none"]
	for _, item := range ranked {
		if len(selected) >= beamWidth {
			break
		}
		if item.id != value.Choice && item.probability > noneProbability {
			selected[item.id] = true
		}
	}
	return selected
}

func (interpreter *speculativeRouteEvaluator) cancel(definition *routeNodeDefinition) {
	if future := interpreter.futures[definition.id]; future != nil {
		future.cancel()
	}
	for _, optionID := range definition.childOrder {
		for _, child := range definition.children[optionID] {
			interpreter.cancel(child)
		}
	}
}

func (interpreter *speculativeRouteEvaluator) finish() routingUsage {
	interpreter.mu.Lock()
	used := make(map[string]bool, len(interpreter.used))
	for nodeID := range interpreter.used {
		used[nodeID] = true
	}
	interpreter.mu.Unlock()
	for nodeID, future := range interpreter.futures {
		if !used[nodeID] {
			future.cancel()
		}
	}
	var usages []routingUsage
	for _, definition := range flattenRouteDefinitions(interpreter.roots) {
		future := interpreter.futures[definition.id]
		if future == nil {
			continue
		}
		<-future.done
		if future.started && future.err == nil {
			usages = append(usages, usageFromResponse(future.response))
		}
	}
	return mergeUsage(defaultModel, usages...)
}

func findRouteDefinition(definition *routeNodeDefinition, nodeID string) *routeNodeDefinition {
	if definition.id == nodeID {
		return definition
	}
	for _, optionID := range definition.childOrder {
		for _, child := range definition.children[optionID] {
			if found := findRouteDefinition(child, nodeID); found != nil {
				return found
			}
		}
	}
	return nil
}

func flattenRouteDefinitions(root *routeNodeDefinition) []*routeNodeDefinition {
	result := []*routeNodeDefinition{root}
	for _, optionID := range root.childOrder {
		for _, child := range root.children[optionID] {
			result = append(result, flattenRouteDefinitions(child)...)
		}
	}
	return result
}
