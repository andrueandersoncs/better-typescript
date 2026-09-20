package semanticlint

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"slices"
	"strconv"
	"strings"
)

type questionScope struct {
	RuleID    string
	Stage     string
	NodeID    string
	Partition int
}

func (scope questionScope) key(questionID string) string {
	return strings.Join([]string{scope.RuleID, scope.Stage, scope.NodeID, questionID}, "/")
}

type PlanCandidateInspection struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	ChildNodeID string `json:"childNodeId,omitempty"`
}

type PlanNodeInspection struct {
	NodeID             string                    `json:"nodeId"`
	ParentCandidateKey string                    `json:"parentCandidateKey,omitempty"`
	Stage              string                    `json:"stage"`
	QuestionID         string                    `json:"questionId,omitempty"`
	QuestionType       string                    `json:"questionType,omitempty"`
	Candidates         []PlanCandidateInspection `json:"candidates"`
	Disposition        string                    `json:"disposition"`
	AutomaticSelection string                    `json:"automaticSelection,omitempty"`
	RequestBytes       int                       `json:"requestBytes,omitempty"`
	DeclarationHash    string                    `json:"declarationHash,omitempty"`
}

type RoutePlanInspection struct {
	Status string               `json:"status"`
	Nodes  []PlanNodeInspection `json:"nodes"`
	Cost   PlanCostEstimate     `json:"cost"`
}

type UnresolvedStage struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type RelevanceCandidateInspection struct {
	Index           int            `json:"index"`
	EvidenceID      string         `json:"evidenceId"`
	EvidenceHash    string         `json:"evidenceHash"`
	QuestionID      string         `json:"questionId"`
	QuestionType    string         `json:"questionType"`
	Instructions    any            `json:"instructions"`
	Criteria        map[string]any `json:"criteria"`
	Partition       int            `json:"partition,omitempty"`
	Disposition     string         `json:"disposition"`
	RequestBytes    int            `json:"requestBytes,omitempty"`
	DeclarationHash string         `json:"declarationHash,omitempty"`
}

type RelevancePartitionInspection struct {
	Partition       int      `json:"partition"`
	QuestionIDs     []string `json:"questionIds"`
	RequestBytes    int      `json:"requestBytes"`
	DeclarationHash string   `json:"declarationHash"`
}

type RelevancePlanInspection struct {
	Status     string                         `json:"status"`
	Candidates []RelevanceCandidateInspection `json:"candidates"`
	Partitions []RelevancePartitionInspection `json:"partitions"`
	Cost       PlanCostEstimate               `json:"cost"`
}

type PlanCostEstimate struct {
	DeclaredQuestions int      `json:"declaredQuestions"`
	MinimumCalls      int      `json:"minimumCalls"`
	MaximumCalls      int      `json:"maximumCalls"`
	MinimumBytes      int      `json:"minimumBytes"`
	MaximumBytes      int      `json:"maximumBytes"`
	Exact             bool     `json:"exact"`
	TokenCost         *int     `json:"tokenCost"`
	MonetaryCost      *float64 `json:"monetaryCost"`
	PricingStatus     string   `json:"pricingStatus"`
}

type planValidationError struct {
	Stage     string
	RuleID    string
	Identity  string
	Invariant string
}

func (failure *planValidationError) Error() string {
	return fmt.Sprintf("invalid %s plan for rule %s at %s: %s", failure.Stage, failure.RuleID, failure.Identity, failure.Invariant)
}

func invalidPlan(stage, ruleID, identity, invariant string) error {
	if identity == "" {
		identity = "<plan>"
	}
	return &planValidationError{Stage: stage, RuleID: ruleID, Identity: identity, Invariant: invariant}
}

func validateRoutePlan(plan routePlan) error {
	if plan.rule.ID == "" {
		return invalidPlan("route", "<unknown>", plan.domains.nodeID, "rule id is empty")
	}
	if plan.domains.nodeID != "domain" || plan.domains.stage != "domain" {
		return invalidPlan("route", plan.rule.ID, plan.domains.nodeID, "root must be the domain stage")
	}
	if err := validateRouteChoice(plan.rule.ID, plan.domains, "domain"); err != nil {
		return err
	}
	for _, domainOption := range plan.domains.candidates() {
		domain := domainOption.value
		if domainOption.id != "domain_"+domain.name {
			return invalidPlan("route", plan.rule.ID, domainOption.id, "domain candidate does not match its value")
		}
		if domain.paths.stage != "path" {
			return invalidPlan("route", plan.rule.ID, domain.paths.nodeID, "domain child must be a path stage")
		}
		if err := validateRouteChoice(plan.rule.ID, domain.paths, "path"); err != nil {
			return err
		}
		for _, pathOption := range domain.paths.candidates() {
			path := pathOption.value
			if pathOption.id != path.file.ID || domainForPath(path.file.Path) != domain.name {
				return invalidPlan("route", plan.rule.ID, pathOption.id, "path does not belong to its declared domain")
			}
			if !plan.rule.matchesPath(path.file.Path) {
				return invalidPlan("route", plan.rule.ID, pathOption.id, "path does not match the rule")
			}
			if path.hunks.stage != "hunk" {
				return invalidPlan("route", plan.rule.ID, path.hunks.nodeID, "path child must be a hunk stage")
			}
			if err := validateRouteChoice(plan.rule.ID, path.hunks, "hunk"); err != nil {
				return err
			}
			for _, hunkOption := range path.hunks.candidates() {
				if hunkOption.value.file.ID != path.file.ID || hunkOption.value.hunk.Path != path.file.Path {
					return invalidPlan("route", plan.rule.ID, hunkOption.id, "hunk does not belong to its declared path")
				}
			}
		}
	}
	return nil
}

func validateRouteChoice[T any](ruleID string, choice routeChoice[T], expectedStage string) error {
	if choice.stage != expectedStage || choice.nodeID == "" {
		return invalidPlan("route", ruleID, choice.nodeID, "stage name or node id is invalid")
	}
	if len(choice.options) > maximumChoiceOptions-1 {
		return invalidPlan("route", ruleID, choice.nodeID, "choice exceeds the bucket limit")
	}
	seen := make(map[string]bool, len(choice.options))
	for _, option := range choice.options {
		if option.id == "" || option.id == "none" || seen[option.id] {
			return invalidPlan("route", ruleID, option.id, "candidate ids must be non-empty and unique within a Choice")
		}
		seen[option.id] = true
		isBucket := strings.HasPrefix(option.id, "bucket_")
		if isBucket != (option.members != nil) {
			return invalidPlan("route", ruleID, option.id, "bucket and leaf shape disagree")
		}
		if option.members != nil {
			wantNodeID := choice.nodeID + "/" + option.id
			if option.members.nodeID != wantNodeID {
				return invalidPlan("route", ruleID, option.id, "bucket child has the wrong parent")
			}
			if err := validateRouteChoice(ruleID, *option.members, expectedStage); err != nil {
				return err
			}
		}
	}
	return nil
}

func validateRelevancePlan(plan relevancePlan) error {
	if len(plan.judgments) != len(plan.candidates) {
		return invalidPlan("relevance", plan.rule.ID, "<plan>", "must declare one judgment per candidate")
	}
	seenCandidates := make([]bool, len(plan.candidates))
	seenQuestions := make(map[string]bool, len(plan.judgments))
	for index, judgment := range plan.judgments {
		if judgment.candidateIndex < 0 || judgment.candidateIndex >= len(plan.candidates) {
			return invalidPlan("relevance", plan.rule.ID, judgment.questionID, "candidate index is out of bounds")
		}
		if judgment.candidateIndex != index {
			return invalidPlan("relevance", plan.rule.ID, judgment.questionID, "judgments are not in stable candidate order")
		}
		if seenCandidates[judgment.candidateIndex] {
			return invalidPlan("relevance", plan.rule.ID, judgment.questionID, "candidate has more than one judgment")
		}
		seenCandidates[judgment.candidateIndex] = true
		if judgment.questionID == "" || seenQuestions[judgment.questionID] {
			return invalidPlan("relevance", plan.rule.ID, judgment.questionID, "question ids must be non-empty and unique")
		}
		seenQuestions[judgment.questionID] = true
		if judgment.question.Type != "noul" {
			return invalidPlan("relevance", plan.rule.ID, judgment.questionID, "question must be a Noul")
		}
	}
	return nil
}

func validateSelectedEvidence(selected selectedEvidence, model string) error {
	if len(selected.evidence) > maximumSelectedEvidence {
		return invalidPlan("selected-evidence", selected.rule.ID, "<selection>", "selection exceeds its limit")
	}
	for index, item := range selected.evidence {
		if !validProbability(item.RelevanceProbability) || item.RelevanceProbability < minimumRelevanceProbability {
			return invalidPlan("selected-evidence", selected.rule.ID, item.ID, "selected probability is below the relevance threshold")
		}
		if index > 0 && selected.evidence[index-1].RelevanceProbability < item.RelevanceProbability {
			return invalidPlan("selected-evidence", selected.rule.ID, item.ID, "selection is not in thresholded probability order")
		}
	}
	if selected.hasChanged != slices.ContainsFunc(selected.evidence, isChangedEvidence) {
		return invalidPlan("selected-evidence", selected.rule.ID, "<selection>", "hasChanged does not match the selected evidence")
	}
	if requestSize(finalJudgmentRequest(buildFinalJudgmentPlan(selected), model)) > maximumRequestBytes {
		return invalidPlan("selected-evidence", selected.rule.ID, "<selection>", "final request exceeds the request-size limit")
	}
	return nil
}

func validateFinalJudgmentPlan(plan finalJudgmentPlan) error {
	if err := validateSelectedEvidence(plan.selected, ""); err != nil {
		return err
	}
	if !plan.selected.hasChanged {
		return invalidPlan("final", plan.selected.rule.ID, plan.questionID, "final evaluation requires changed evidence")
	}
	if plan.questionID != plan.selected.rule.ID {
		return invalidPlan("final", plan.selected.rule.ID, plan.questionID, "question id must match the rule id")
	}
	if plan.question.Type != "noul" {
		return invalidPlan("final", plan.selected.rule.ID, plan.questionID, "exactly one Noul must be declared")
	}
	return nil
}

func inspectRoutePlan(plan routePlan, model string) RoutePlanInspection {
	inspection := RoutePlanInspection{Status: "declared"}
	appendRouteInspection(&inspection.Nodes, plan.rule, plan.domains, model, "", func(domain routeChoiceOption[routeDomain]) {
		parent := plan.domains.nodeID + ":" + domain.id
		appendRouteInspection(&inspection.Nodes, plan.rule, domain.value.paths, model, parent, func(path routeChoiceOption[routePath]) {
			parent := domain.value.paths.nodeID + ":" + path.id
			appendRouteInspection(&inspection.Nodes, plan.rule, path.value.hunks, model, parent, func(routeChoiceOption[routedHunk]) {})
		})
	})
	inspection.Cost = estimateInspectionCost(inspection.Nodes)
	return inspection
}

func inspectRelevancePlan(plan relevancePlan, model string) (RelevancePlanInspection, error) {
	if err := validateRelevancePlan(plan); err != nil {
		return RelevancePlanInspection{}, err
	}
	inspection := RelevancePlanInspection{Status: "declared", Cost: estimateRelevancePlan(plan, model)}
	type partitionMetadata struct {
		number int
		bytes  int
		hash   string
	}
	questionPartitions := make(map[string]partitionMetadata)
	for index, evaluation := range relevanceEvaluations(plan, model) {
		partition := RelevancePartitionInspection{
			Partition:       index + 1,
			QuestionIDs:     append([]string(nil), evaluation.request.QuestionOrder...),
			RequestBytes:    requestSize(evaluation.request),
			DeclarationHash: evaluationHash(evaluation.request),
		}
		inspection.Partitions = append(inspection.Partitions, partition)
		for _, questionID := range partition.QuestionIDs {
			questionPartitions[questionID] = partitionMetadata{number: partition.Partition, bytes: partition.RequestBytes, hash: partition.DeclarationHash}
		}
	}
	for index, judgment := range plan.judgments {
		candidate := plan.candidates[judgment.candidateIndex]
		evidenceID := candidate.ID
		if evidenceID == "" {
			evidenceID = candidate.Path + ":" + strconv.Itoa(max(candidate.StartLine, 1))
		}
		item := RelevanceCandidateInspection{
			Index: index, EvidenceID: evidenceID, EvidenceHash: evidenceHash(candidate),
			QuestionID: judgment.questionID, QuestionType: judgment.question.Type,
			Instructions: judgment.question.Instructions, Criteria: judgment.question.Criteria,
			Disposition: "dropped_too_large",
		}
		if partition, ok := questionPartitions[judgment.questionID]; ok {
			item.Partition = partition.number
			item.RequestBytes = partition.bytes
			item.DeclarationHash = partition.hash
			item.Disposition = "declared"
		}
		inspection.Candidates = append(inspection.Candidates, item)
	}
	return inspection, nil
}

func appendRouteInspection[T any](nodes *[]PlanNodeInspection, rule Rule, choice routeChoice[T], model, parent string, visitLeaf func(routeChoiceOption[T])) {
	candidates := make([]PlanCandidateInspection, len(choice.options))
	for index, option := range choice.options {
		candidates[index] = PlanCandidateInspection{ID: option.id, Description: option.description}
		if option.members != nil {
			candidates[index].ChildNodeID = option.members.nodeID
		}
	}
	node := PlanNodeInspection{NodeID: choice.nodeID, ParentCandidateKey: parent, Stage: choice.stage, Candidates: candidates}
	switch len(choice.options) {
	case 0:
		node.Disposition = "empty"
	case 1:
		node.Disposition = "automatic"
		node.AutomaticSelection = choice.options[0].id
	default:
		request, evaluatable := routeChoiceRequest(rule, choice, model)
		node.QuestionID = "route"
		node.QuestionType = "choice"
		node.RequestBytes = requestSize(request)
		node.DeclarationHash = evaluationHash(request)
		if evaluatable {
			node.Disposition = "unresolved"
		} else {
			node.Disposition = "stopped_too_large"
		}
	}
	*nodes = append(*nodes, node)
	for _, option := range choice.options {
		if option.members != nil {
			appendRouteInspection(nodes, rule, *option.members, model, choice.nodeID+":"+option.id, visitLeaf)
			continue
		}
		visitLeaf(option)
	}
}

func estimateInspectionCost(nodes []PlanNodeInspection) PlanCostEstimate {
	estimate := PlanCostEstimate{PricingStatus: "unknown: no versioned pricing metadata supplied"}
	for _, node := range nodes {
		if node.QuestionID == "" {
			continue
		}
		estimate.DeclaredQuestions++
		if node.Disposition == "unresolved" {
			estimate.MaximumCalls++
			estimate.MaximumBytes += node.RequestBytes
		}
	}
	estimate.Exact = estimate.MinimumCalls == estimate.MaximumCalls
	return estimate
}

func addCost(left, right PlanCostEstimate) PlanCostEstimate {
	return PlanCostEstimate{
		DeclaredQuestions: left.DeclaredQuestions + right.DeclaredQuestions,
		MinimumCalls:      left.MinimumCalls + right.MinimumCalls,
		MaximumCalls:      left.MaximumCalls + right.MaximumCalls,
		MinimumBytes:      left.MinimumBytes + right.MinimumBytes,
		MaximumBytes:      left.MaximumBytes + right.MaximumBytes,
		Exact:             left.Exact && right.Exact,
		PricingStatus:     "unknown: no versioned pricing metadata supplied",
	}
}

func estimateRelevancePlan(plan relevancePlan, model string) PlanCostEstimate {
	evaluations := relevanceEvaluations(plan, model)
	estimate := PlanCostEstimate{
		DeclaredQuestions: len(plan.judgments),
		MinimumCalls:      len(evaluations),
		MaximumCalls:      len(evaluations),
		Exact:             true,
		PricingStatus:     "unknown: no versioned pricing metadata supplied",
	}
	for _, evaluation := range evaluations {
		size := requestSize(evaluation.request)
		estimate.MinimumBytes += size
		estimate.MaximumBytes += size
	}
	return estimate
}

func estimateFinalPlan(plan finalJudgmentPlan, model string) PlanCostEstimate {
	estimate := PlanCostEstimate{DeclaredQuestions: 1, Exact: true, PricingStatus: "unknown: no versioned pricing metadata supplied"}
	if !plan.selected.hasChanged {
		return estimate
	}
	size := requestSize(finalJudgmentRequest(plan, model))
	estimate.MinimumCalls, estimate.MaximumCalls = 1, 1
	estimate.MinimumBytes, estimate.MaximumBytes = size, size
	return estimate
}

func routeChoiceRequest[T any](rule Rule, choice routeChoice[T], model string) (evaluationRequest, bool) {
	if len(choice.options) <= 1 {
		return evaluationRequest{}, false
	}
	descriptionBytes := max(128, (maximumRequestBytes-len(rule.Definition)-4096)/(len(choice.options)+1))
	criteria := make(map[string]any, len(choice.options)+1)
	candidateIDs := make([]string, len(choice.options))
	for index, option := range choice.options {
		criteria[option.id] = truncateBytes(option.description, descriptionBytes)
		candidateIDs[index] = option.id
	}
	criteria["none"] = "None of these candidates supplies relevant evidence."
	request := evaluationRequest{
		State:         choiceState{Stage: choice.stage, CandidateIDs: candidateIDs},
		Model:         model,
		Questions:     map[string]question{"route": {Type: "choice", Instructions: routingInstructions(rule, choice.stage), Criteria: criteria, CriteriaOrder: append(append([]string{}, candidateIDs...), "none")}},
		QuestionOrder: []string{"route"},
		Scope:         questionScope{RuleID: rule.ID, Stage: choice.stage, NodeID: choice.nodeID},
	}
	return request, requestSize(request) <= maximumRequestBytes
}

func evaluationHash(request evaluationRequest) string {
	encoded, err := marshalJSON(request)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func evidenceHash(evidence Evidence) string {
	encoded, err := marshalJSON(struct {
		ID        string `json:"id"`
		Kind      string `json:"kind"`
		Relation  string `json:"relation"`
		Path      string `json:"path"`
		StartLine int    `json:"startLine"`
		EndLine   int    `json:"endLine"`
		Snippet   string `json:"snippet"`
	}{evidence.ID, evidence.Kind, evidence.Relation, evidence.Path, evidence.StartLine, evidence.EndLine, evidence.Snippet})
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func finiteProbability(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0) && validProbability(value)
}

func validateRouteAnswer[T any](ruleID string, choice routeChoice[T], value answer) error {
	declared := make(map[string]bool, len(choice.options)+1)
	for _, option := range choice.options {
		declared[option.id] = true
		probability, ok := value.Probabilities[option.id]
		if ok && !finiteProbability(probability) {
			return invalidPlan("route", ruleID, choice.nodeID+"/"+option.id, "Choice probability is invalid")
		}
	}
	declared["none"] = true
	if probability, ok := value.Probabilities["none"]; !ok || !finiteProbability(probability) {
		return invalidPlan("route", ruleID, choice.nodeID+"/none", "Choice probability is missing or invalid")
	}
	if !declared[value.Choice] {
		return invalidPlan("route", ruleID, choice.nodeID+"/"+value.Choice, "Choice answer is outside the declared candidate set")
	}
	for candidate := range value.Probabilities {
		if !declared[candidate] {
			return invalidPlan("route", ruleID, choice.nodeID+"/"+candidate, "Choice answer contains an undeclared candidate")
		}
	}
	return nil
}

func appendSkippedRouteProvenance(plan routePlan, model string, visited []string, records []QuestionProvenance) []QuestionProvenance {
	inspection := inspectRoutePlan(plan, model)
	visitedSet := make(map[string]bool, len(visited))
	for _, nodeID := range visited {
		visitedSet[nodeID] = true
	}
	byNode := make(map[string][]QuestionProvenance)
	for _, record := range records {
		byNode[record.PlanNodeID] = append(byNode[record.PlanNodeID], record)
	}
	result := make([]QuestionProvenance, 0, len(records)+len(inspection.Nodes))
	for _, node := range inspection.Nodes {
		if existing := byNode[node.NodeID]; len(existing) > 0 {
			result = append(result, existing...)
			continue
		}
		if visitedSet[node.NodeID] {
			continue
		}
		result = append(result, QuestionProvenance{
			Key:             questionScope{RuleID: plan.rule.ID, Stage: node.Stage, NodeID: node.NodeID}.key("route"),
			RuleID:          plan.rule.ID,
			Stage:           node.Stage,
			PlanNodeID:      node.NodeID,
			QuestionID:      "route",
			DeclarationHash: node.DeclarationHash,
			Model:           fallbackModel(model),
			Decision:        "skipped",
		})
	}
	return result
}
