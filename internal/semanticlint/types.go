package semanticlint

import (
	"bytes"
	"encoding/json"
	"time"

	"github.com/andrueandersoncs/better-typescript/internal/fileglob"
)

const (
	defaultModel           = "jev-latest"
	defaultThreshold       = 0.7
	maximumPassProbability = 0.4
	maximumRequestBytes    = 32_000
	defaultHTTPTimeout     = 10 * time.Second
	maximumHTTPRetries     = 2
)

func modelOrDefault(model string) string {
	if model == "" {
		return defaultModel
	}
	return model
}

var repositoryExtensions = map[string]bool{
	".ts": true, ".tsx": true, ".js": true, ".jsx": true,
	".mjs": true, ".cjs": true, ".json": true, ".toml": true,
	".yaml": true, ".yml": true, ".md": true,
}

type Options struct {
	Threshold      float64
	Model          string
	RulesDirectory string
	CommitRange    string
	FilePatterns   []string
	RuleNames      []string
	AllFiles       bool
	JSON           bool
	DryRun         bool
}

type Source struct {
	Path string
	Text string
}

type Rule struct {
	ID       string
	Path     string
	Title    string
	Source   string
	Globs    []string
	Patterns []fileglob.Pattern
}

type Finding struct {
	RulePath             string  `json:"rulePath"`
	RuleTitle            string  `json:"ruleTitle"`
	Classification       string  `json:"classification"`
	Message              string  `json:"message"`
	ViolationProbability float64 `json:"violationProbability"`
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
	Usage                         Usage     `json:"usage"`
}

type DryRunPlan struct {
	Kind  string       `json:"kind"`
	Model string       `json:"model,omitempty"`
	Files []DryRunFile `json:"files"`
}

type DryRunFile struct {
	Path       string            `json:"path"`
	FileBytes  int               `json:"fileBytes"`
	Rules      []string          `json:"rules"`
	Partitions []DryRunPartition `json:"partitions"`
}

type DryRunPartition struct {
	Rules         []string `json:"rules"`
	QuestionCount int      `json:"questionCount"`
	RequestBytes  int      `json:"requestBytes"`
}

type question struct {
	Type         string `json:"type"`
	Instructions string `json:"instructions"`
}

type evaluationRequest struct {
	State     map[string]string   `json:"state"`
	Questions map[string]question `json:"questions"`
	Model     string              `json:"model,omitempty"`
}

type answer struct {
	Type string  `json:"type"`
	Noul float64 `json:"noul"`
}

type evaluationResponse struct {
	Model   string            `json:"model"`
	Answers map[string]answer `json:"answers"`
	Usage   Usage             `json:"usage"`
}

func marshalJSON(value any) ([]byte, error) {
	var output bytes.Buffer
	encoder := json.NewEncoder(&output)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(output.Bytes(), []byte("\n")), nil
}
