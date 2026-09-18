package semanticlint

import (
	"time"

	"github.com/andrueandersoncs/better-typescript/internal/fileglob"
)

const (
	defaultModel                = "jev-latest"
	defaultThreshold            = 0.7
	maximumPassProbability      = 0.4
	maximumRequestBytes         = 32_000
	maximumEvidenceSnippetBytes = 6_000
	maximumChoiceOptions        = 16
	beamWidth                   = 3
	maximumExpandedCandidates   = 12
	maximumSelectedEvidence     = 6
	minimumRelevanceProbability = 0.45
	sourceChunkLineCount        = 80
	sourceChunkOverlapLineCount = 20
	maximumConcurrentRequests   = 32
	defaultHTTPTimeout          = 10 * time.Second
	maximumHTTPRetries          = 2
)

var repositoryExtensions = map[string]bool{
	".ts": true, ".tsx": true, ".js": true, ".jsx": true,
	".mjs": true, ".cjs": true, ".json": true, ".toml": true,
	".yaml": true, ".yml": true, ".md": true,
}

var codeExtensions = map[string]bool{
	".ts": true, ".tsx": true, ".js": true, ".jsx": true,
	".mjs": true, ".cjs": true,
}

type Options struct {
	Threshold         float64
	Model             string
	ReviewContextPath string
	RulesDirectory    string
	JSON              bool
	DryRun            bool
}

type Source struct {
	Path     string
	Language string
	Text     string
}

type SourceCandidate struct {
	Path      string
	Language  string
	StartLine int
	EndLine   int
	Text      string
}

type DiffHunk struct {
	ID           string `json:"id"`
	Path         string `json:"-"`
	OldStartLine int    `json:"-"`
	OldLineCount int    `json:"-"`
	NewStartLine int    `json:"-"`
	NewLineCount int    `json:"-"`
	Header       string `json:"header"`
	Patch        string `json:"-"`
}

type DiffFile struct {
	ID           string     `json:"id"`
	Path         string     `json:"path"`
	PreviousPath string     `json:"previousPath,omitempty"`
	Status       string     `json:"status"`
	Hunks        []DiffHunk `json:"hunks"`
}

type RepositoryEvidence struct {
	Paths         []string
	ChangedPaths  []string
	DeletedPaths  []string
	Files         []Source
	ReviewContext *Source
	DiffFiles     []DiffFile
}

type Evidence struct {
	ID                   string  `json:"id,omitempty"`
	Kind                 string  `json:"kind,omitempty"`
	Relation             string  `json:"relation,omitempty"`
	Path                 string  `json:"path"`
	StartLine            int     `json:"startLine,omitempty"`
	EndLine              int     `json:"endLine,omitempty"`
	Snippet              string  `json:"snippet,omitempty"`
	RelevanceProbability float64 `json:"relevanceProbability,omitempty"`
}

type RuleMetadata struct {
	Evaluator          string
	Scope              string
	RequiredEvidence   []string
	DeterministicCheck string
}

type Rule struct {
	ID         string
	Path       string
	Title      string
	Definition string
	Globs      []string
	Patterns   []fileglob.Pattern
	Metadata   RuleMetadata
}

type RoutingDecision struct {
	Stage       string  `json:"stage"`
	Candidate   string  `json:"candidate"`
	Probability float64 `json:"probability"`
	Selected    bool    `json:"selected"`
}

type Finding struct {
	RulePath             string     `json:"rulePath"`
	RuleTitle            string     `json:"ruleTitle"`
	Evaluator            string     `json:"evaluator"`
	Classification       string     `json:"classification"`
	Message              string     `json:"message"`
	ViolationProbability *float64   `json:"violationProbability,omitempty"`
	Evidence             []Evidence `json:"evidence"`
	Routing              *Routing   `json:"routing,omitempty"`
}

type Routing struct {
	Decisions           []RoutingDecision `json:"decisions"`
	SelectedEvidenceIDs []string          `json:"selectedEvidenceIds"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type FindingReport struct {
	Source                        string    `json:"source"`
	Model                         string    `json:"model"`
	ViolationProbabilityThreshold float64   `json:"violationProbabilityThreshold"`
	Findings                      []Finding `json:"findings"`
	Usage                         *Usage    `json:"usage,omitempty"`
}

type DryRunPlan struct {
	Kind      string           `json:"kind"`
	Layers    []string         `json:"layers"`
	Rules     []DryRunRule     `json:"rules"`
	DiffFiles []DryRunDiffFile `json:"diffFiles"`
	Limits    map[string]any   `json:"limits"`
}

type DryRunRule struct {
	RulePath  string `json:"rulePath"`
	Evaluator string `json:"evaluator"`
	Scope     string `json:"scope"`
}

type DryRunDiffFile struct {
	ID     string       `json:"id"`
	Path   string       `json:"path"`
	Status string       `json:"status"`
	Hunks  []DryRunHunk `json:"hunks"`
}

type DryRunHunk struct {
	ID        string `json:"id"`
	Header    string `json:"header"`
	StartLine int    `json:"startLine"`
	EndLine   int    `json:"endLine"`
}

type question struct {
	Type         string         `json:"type"`
	Instructions any            `json:"instructions"`
	Criteria     map[string]any `json:"criteria,omitempty"`
}

type evaluationRequest struct {
	State     any                 `json:"state"`
	Model     string              `json:"model"`
	Questions map[string]question `json:"questions"`
}

type answer struct {
	Type          string             `json:"type"`
	Choice        string             `json:"choice,omitempty"`
	Noul          float64            `json:"noul,omitempty"`
	Confidence    float64            `json:"confidence,omitempty"`
	Probabilities map[string]float64 `json:"probabilities,omitempty"`
}

type evaluationResponse struct {
	Model   string            `json:"model"`
	Answers map[string]answer `json:"answers"`
	Usage   Usage             `json:"usage"`
}
