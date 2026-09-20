package semanticlint

import "strings"

type QuestionProvenance struct {
	Key                 string   `json:"key"`
	RuleID              string   `json:"ruleId"`
	Stage               string   `json:"stage"`
	PlanNodeID          string   `json:"planNodeId"`
	QuestionID          string   `json:"questionId"`
	CandidateID         string   `json:"candidateId,omitempty"`
	EvidenceID          string   `json:"evidenceId,omitempty"`
	RouteLeafID         string   `json:"routeLeafId,omitempty"`
	EvidenceHash        string   `json:"evidenceHash,omitempty"`
	SelectedEvidenceIDs []string `json:"selectedEvidenceIds,omitempty"`
	DeclarationHash     string   `json:"declarationHash,omitempty"`
	Model               string   `json:"model"`
	PhysicalRequest     string   `json:"physicalRequest,omitempty"`
	AnswerType          string   `json:"answerType,omitempty"`
	Probability         *float64 `json:"probability,omitempty"`
	Decision            string   `json:"decision"`
	Threshold           *float64 `json:"threshold,omitempty"`
	InputTokens         int      `json:"inputTokens,omitempty"`
	OutputTokens        int      `json:"outputTokens,omitempty"`
}

type TraceEvent struct {
	Kind                string   `json:"kind"`
	RuleID              string   `json:"ruleId"`
	Stage               string   `json:"stage"`
	PlanNodeID          string   `json:"planNodeId,omitempty"`
	QuestionID          string   `json:"questionId,omitempty"`
	CandidateID         string   `json:"candidateId,omitempty"`
	EvidenceID          string   `json:"evidenceId,omitempty"`
	RouteLeafID         string   `json:"routeLeafId,omitempty"`
	EvidenceHash        string   `json:"evidenceHash,omitempty"`
	SelectedEvidenceIDs []string `json:"selectedEvidenceIds,omitempty"`
	DeclarationHash     string   `json:"declarationHash,omitempty"`
	Model               string   `json:"model,omitempty"`
	PhysicalRequest     string   `json:"physicalRequest,omitempty"`
	Probability         *float64 `json:"probability,omitempty"`
	Decision            string   `json:"decision,omitempty"`
	InputTokens         int      `json:"inputTokens,omitempty"`
	OutputTokens        int      `json:"outputTokens,omitempty"`
}

func probabilityPointer(value float64) *float64 {
	copy := value
	return &copy
}

func traceFromProvenance(records []QuestionProvenance) []TraceEvent {
	var trace []TraceEvent
	for _, record := range records {
		if record.AnswerType != "" {
			kind := "question_answered"
			if record.Stage == "final" {
				kind = "final_answered"
			}
			trace = append(trace, traceEvent(record, kind))
		}
		kind := ""
		switch record.Decision {
		case "automatic":
			kind = "branch_selected"
		case "selected":
			if record.Stage == "relevance" {
				kind = "evidence_selected"
			} else {
				kind = "branch_selected"
			}
		case "rejected":
			if record.Stage == "relevance" {
				kind = "evidence_rejected"
			} else {
				kind = "branch_rejected"
			}
		case "skipped":
			kind = "branch_skipped"
		case "dropped_size":
			kind = "question_skipped"
		case "short_circuited":
			kind = "final_short_circuited"
		}
		if kind != "" {
			trace = append(trace, traceEvent(record, kind))
		}
	}
	return trace
}

func traceEvent(record QuestionProvenance, kind string) TraceEvent {
	return TraceEvent{
		Kind: kind, RuleID: record.RuleID, Stage: record.Stage, PlanNodeID: record.PlanNodeID,
		QuestionID: record.QuestionID, CandidateID: record.CandidateID, EvidenceID: record.EvidenceID, RouteLeafID: record.RouteLeafID,
		EvidenceHash: record.EvidenceHash, SelectedEvidenceIDs: record.SelectedEvidenceIDs,
		DeclarationHash: record.DeclarationHash, Model: record.Model, PhysicalRequest: record.PhysicalRequest,
		Probability: record.Probability, Decision: record.Decision,
		InputTokens: record.InputTokens, OutputTokens: record.OutputTokens,
	}
}

func annotateRelevanceProvenance(records []QuestionProvenance, selected selectedEvidence, route routeExecution[routedHunk]) []QuestionProvenance {
	selectedIDs := make(map[string]bool, len(selected.evidence))
	for _, evidence := range selected.evidence {
		selectedIDs[evidence.ID] = true
	}
	result := append([]QuestionProvenance(nil), records...)
	for index := range result {
		if result[index].Decision != "dropped_size" {
			result[index].Decision = "rejected"
			if selectedIDs[result[index].EvidenceID] {
				result[index].Decision = "selected"
			}
			result[index].Threshold = probabilityPointer(minimumRelevanceProbability)
		}
		for _, routed := range route.selected {
			hunkID := routed.value.hunk.ID
			if result[index].EvidenceID == hunkID || strings.HasPrefix(result[index].EvidenceID, hunkID+"_") {
				result[index].RouteLeafID = hunkID
				break
			}
		}
	}
	return result
}

func executionTrace(ruleID string, records []QuestionProvenance, classification string) []TraceEvent {
	trace := []TraceEvent{{Kind: "plan_built", RuleID: ruleID, Stage: "route"}}
	trace = append(trace, traceForStages(records, "domain", "path", "hunk")...)
	trace = append(trace, TraceEvent{Kind: "plan_built", RuleID: ruleID, Stage: "relevance"})
	trace = append(trace, traceForStages(records, "relevance")...)
	trace = append(trace, TraceEvent{Kind: "evidence_ranked", RuleID: ruleID, Stage: "selected-evidence"})
	trace = append(trace, TraceEvent{Kind: "plan_built", RuleID: ruleID, Stage: "final"})
	trace = append(trace, traceForStages(records, "final")...)
	trace = append(trace, TraceEvent{Kind: "finding_composed", RuleID: ruleID, Stage: "finding", Decision: classification})
	return trace
}

func traceForStages(records []QuestionProvenance, stages ...string) []TraceEvent {
	allowed := make(map[string]bool, len(stages))
	for _, stage := range stages {
		allowed[stage] = true
	}
	var selected []QuestionProvenance
	for _, record := range records {
		if allowed[record.Stage] {
			selected = append(selected, record)
		}
	}
	return traceFromProvenance(selected)
}
