package semanticlint

import "strings"

// blockPlaceholder marks where the evidence prompt names the block it asks about.
const blockPlaceholder = "{block}"

// prompts holds every instruction and criterion sent to TypeSafe.
// The CLI always uses defaultPrompts; evals swap in variants to compare wording.
type prompts struct {
	Candidate          string `json:"candidate"`
	Evidence           string `json:"evidence"`
	Final              string `json:"final"`
	Applicability      string `json:"applicability"`
	ApplicabilityTrue  string `json:"applicabilityTrue"`
	ApplicabilityFalse string `json:"applicabilityFalse"`
}

var defaultPrompts = prompts{
	Candidate:          "Could the `file` segment provide evidence that the complete file at `path` violates the following rule?\nThis is candidate selection, not a final verdict. Apply the rule's scope and exceptions. Answer yes when the segment shows a concrete construct, behavior, or omission that plausibly conflicts with the rule, or provides context needed to evaluate a specific candidate violation. A candidate need not be proved within this segment; do not require the rest of the file to be visible. Judge semantics and the role of the code, not just matching words or APIs. An absent requirement is evidence when the segment shows where it should be satisfied; do not invent unseen behavior or dependencies. Answer no for mere topical relevance, clearly compliant code, or an inapplicable rule. Uncertainty about a concrete candidate favors yes; uncertainty without a concrete candidate does not.\nRule:\n",
	Evidence:           "Could `{block}` provide concrete evidence, or context needed, for deciding whether the complete file violates the rule in `policy`? Answer yes for plausible evidence or necessary context, not merely related code. Answer no if this block cannot contribute.",
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
