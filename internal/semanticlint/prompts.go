package semanticlint

import "strings"

// blockPlaceholder marks where the evidence prompt names the block it asks about.
const blockPlaceholder = "{block}"

// prompts holds every instruction and criterion sent to TypeSafe.
// The CLI always uses defaultPrompts; evals swap in variants to compare wording.
// A guide is the guidance every question of a stage shares. It sits in state once per request,
// where TypeSafe bills it once, and each question only points at it.
type prompts struct {
	Candidate          string `json:"candidate"`
	CandidateGuide     string `json:"candidateGuide"`
	Evidence           string `json:"evidence"`
	EvidenceGuide      string `json:"evidenceGuide"`
	Final              string `json:"final"`
	Applicability      string `json:"applicability"`
	ApplicabilityTrue  string `json:"applicabilityTrue"`
	ApplicabilityFalse string `json:"applicabilityFalse"`
}

var defaultPrompts = prompts{
	Candidate:          "Apply `selection_guide` to the following rule.\nRule:\n",
	CandidateGuide:     "Could the `file` segment provide evidence that the complete file at `path` violates the rule, or necessary context for evaluating a concrete suspected violation?\n\nThis is candidate selection, not a final verdict. Apply the rule's scope, conditions, and exceptions first. Answer yes when the shown code contains an identifiable construct, behavior, contradiction, or omission that plausibly meets the rule's reporting criteria. An omission is evidence only when the segment shows the place where the requirement should be satisfied. The segment need not prove the violation or contain every related fact.\n\nSelect context only when it is tied to a specific candidate and is needed to interpret that candidate. Do not select material merely because it might become relevant if unseen code contains a violation. Do not invent unseen behavior, dependencies, or conflicting facts.\n\nAnswer no for token or API overlap, imports, generic setup, merely governed constructs, or uncertainty with no concrete candidate. Also answer no when the visible code satisfies the requirement, falls under an exception, or is outside the rule's scope. Judge meaning and code role rather than surface wording. Once a concrete candidate exists, unresolved uncertainty favors yes; otherwise it favors no.",
	Evidence:           "Apply `evidence_guide` to `{block}`.",
	EvidenceGuide:      "Could the block provide concrete evidence, or context needed, for deciding whether the complete file violates the rule in `policy`? Answer yes for plausible evidence or necessary context, not merely related code. Answer no if this block cannot contribute.",
	Final:              "Do the selected source spans in `file`, considered together, establish a concrete violation of the following rule? Answer yes if they demonstrate a violation even when other code complies. Answer no if the shown behavior follows the rule or omitted context is needed to decide.\n\nRule:\n",
	Applicability:      "Is the subject of this rule present in `file`? Answer yes for any covered operation, even one that complies. Do not decide whether the rule is violated.\n\nRule:\n",
	ApplicabilityTrue:  "The source contains an operation of the kind this policy governs, whether it complies or violates.",
	ApplicabilityFalse: "The source has no operation of the kind this policy governs.",
}

func (p *prompts) candidateQuestion(rule Rule) question {
	return question{Type: "noul", Instructions: p.Candidate + rule.Source}
}

func (p *prompts) evidenceQuestion(block string) question {
	return question{Type: "noul", Instructions: strings.ReplaceAll(p.Evidence, blockPlaceholder, block)}
}

func (p *prompts) finalQuestion(rule Rule) question {
	return question{Type: "noul", Instructions: p.Final + rule.Source}
}

func (p *prompts) applicabilityQuestion(rule Rule) question {
	return question{Type: "noul", Instructions: p.Applicability + rule.Source, Criteria: map[string]string{
		"true":  p.ApplicabilityTrue,
		"false": p.ApplicabilityFalse,
	}}
}

// requestSettings fixes the model and wording of every TypeSafe request in one run.
type requestSettings struct {
	model   string
	prompts prompts
}

func (options Options) requestSettings() requestSettings {
	settings := requestSettings{model: modelOrDefault(options.Model), prompts: options.prompts}
	if settings.prompts == (prompts{}) {
		settings.prompts = defaultPrompts
	}
	return settings
}
