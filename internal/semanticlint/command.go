package semanticlint

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"
)

const usage = `Usage: better-typescript semantic [options]

Options:
  --threshold <number>     Violation probability threshold (default: 0.7)
  --model <name>           TypeSafe model override (default: SDK default)
  --review-context <path>  Requirements, rationale, and measurements
  --rules-dir <path>       Additional Markdown rules (default: .better-typescript/rules)
  --range <from>..<to>     Analyze a committed Git range instead of the working tree
  --json                   Print machine-readable results
  --dry-run                Print the routing plan without API calls
  --deterministic           Run exact repository checks without TypeSafe
  --help                   Show this help
`

// Run executes the semantic lint subcommand from a repository root.
func Run(ctx context.Context, root string, args []string, output io.Writer) (int, error) {
	options, help, err := parseOptions(args)
	if err != nil {
		return 2, err
	}
	if help {
		_, err := io.WriteString(output, usage)
		return 0, err
	}
	snapshot, err := gitSnapshot(ctx, root, options.CommitRange)
	if err != nil {
		return 2, err
	}
	if len(snapshot.changedPaths) == 0 {
		_, err := fmt.Fprintln(output, "No changed files to lint.")
		return 0, err
	}
	evidence, err := buildRepositoryEvidence(ctx, root, snapshot, options.ReviewContextPath)
	if err != nil {
		return 2, err
	}
	rules, err := loadRules(root, options.RulesDirectory)
	if err != nil {
		return 2, err
	}
	applicable := make([]Rule, 0, len(rules))
	for _, rule := range rules {
		for _, changedPath := range evidence.ChangedPaths {
			if rule.matchesPath(changedPath) {
				applicable = append(applicable, rule)
				break
			}
		}
	}

	var deterministic, review, semantic []Rule
	for _, rule := range applicable {
		switch rule.Metadata.Evaluator {
		case "deterministic":
			deterministic = append(deterministic, rule)
		case "review":
			review = append(review, rule)
		default:
			semantic = append(semantic, rule)
		}
	}
	var reports []FindingReport
	static := deterministicFindings(deterministic, evidence)
	if options.DeterministicOnly {
		if len(static) > 0 {
			reports = append(reports, FindingReport{Source: "<repository>", Model: "local", ViolationProbabilityThreshold: options.Threshold, Findings: static})
		}
		return writeFindingReports(output, reports, options.JSON)
	}
	if evidence.ReviewContext == nil {
		for _, rule := range review {
			static = append(static, Finding{RulePath: rule.Path, RuleTitle: rule.Title, Evaluator: "review", Classification: "insufficient_evidence", Message: "Requires " + strings.Join(rule.Metadata.RequiredEvidence, " and ") + ".", Evidence: []Evidence{}})
		}
	}
	if len(static) > 0 {
		reports = append(reports, FindingReport{Source: "<repository>", Model: "local", ViolationProbabilityThreshold: options.Threshold, Findings: static})
	}
	routed := semantic
	if evidence.ReviewContext != nil {
		routed = append(append([]Rule{}, semantic...), review...)
	}
	if options.DryRun {
		plan := dryRunPlan(routed, evidence)
		if err := writeJSON(output, append(reportDocuments(reports), plan), false); err != nil {
			return 2, err
		}
		return 0, nil
	}
	if len(routed) > 0 {
		client, err := newTypeSafeClient()
		if err != nil {
			return 2, err
		}
		findings, usage, model, err := evaluateSemanticRules(ctx, routed, evidence, options, newBatchedEvaluator(client, maximumRequestBytes))
		if err != nil {
			return 2, err
		}
		reports = append(reports, FindingReport{Source: "<routed-evidence>", Model: model, ViolationProbabilityThreshold: options.Threshold, Findings: findings, Usage: &usage})
	}
	return writeFindingReports(output, reports, options.JSON)
}

func parseOptions(args []string) (Options, bool, error) {
	options := Options{Threshold: defaultThreshold, RulesDirectory: ".better-typescript/rules"}
	flags := flag.NewFlagSet("semantic", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	flags.Float64Var(&options.Threshold, "threshold", defaultThreshold, "")
	flags.StringVar(&options.Model, "model", "", "")
	flags.StringVar(&options.ReviewContextPath, "review-context", "", "")
	flags.StringVar(&options.RulesDirectory, "rules-dir", options.RulesDirectory, "")
	flags.StringVar(&options.CommitRange, "range", "", "")
	flags.BoolVar(&options.JSON, "json", false, "")
	flags.BoolVar(&options.DryRun, "dry-run", false, "")
	flags.BoolVar(&options.DeterministicOnly, "deterministic", false, "")
	help := false
	flags.BoolVar(&help, "help", false, "")
	if err := flags.Parse(args); err != nil {
		return Options{}, false, err
	}
	if flags.NArg() != 0 {
		return Options{}, false, fmt.Errorf("unexpected arguments: %s", strings.Join(flags.Args(), " "))
	}
	if math.IsNaN(options.Threshold) || math.IsInf(options.Threshold, 0) {
		return Options{}, false, fmt.Errorf("threshold must be a finite number")
	}
	if options.Threshold <= 0.5 {
		return Options{}, false, fmt.Errorf("threshold must exceed 0.5")
	}
	if options.Threshold > 1 {
		return Options{}, false, fmt.Errorf("threshold must not exceed 1")
	}
	if options.DeterministicOnly && options.DryRun {
		return Options{}, false, fmt.Errorf("--deterministic and --dry-run cannot be combined")
	}
	return options, help, nil
}

func dryRunPlan(rules []Rule, evidence RepositoryEvidence) DryRunPlan {
	plan := DryRunPlan{Kind: "dry-run-plan", Layers: []string{"domain-choice", "path-choice", "hunk-choice", "context-expansion", "relevance-nouls", "rule-evaluation"}, Limits: map[string]any{"maximumChoiceOptions": maximumChoiceOptions, "beamWidth": beamWidth, "maximumExpandedCandidates": maximumExpandedCandidates, "maximumSelectedEvidence": maximumSelectedEvidence, "minimumRelevanceProbability": minimumRelevanceProbability, "maximumEvidenceSnippetBytes": maximumEvidenceSnippetBytes}}
	for _, rule := range rules {
		plan.Rules = append(plan.Rules, DryRunRule{RulePath: rule.Path, Evaluator: rule.Metadata.Evaluator, Scope: rule.Metadata.Scope})
	}
	for _, file := range evidence.DiffFiles {
		dryFile := DryRunDiffFile{ID: file.ID, Path: file.Path, Status: file.Status, Hunks: []DryRunHunk{}}
		for _, hunk := range file.Hunks {
			start, count := hunk.NewStartLine, hunk.NewLineCount
			if count == 0 {
				start, count = hunk.OldStartLine, hunk.OldLineCount
			}
			dryFile.Hunks = append(dryFile.Hunks, DryRunHunk{ID: hunk.ID, Header: hunk.Header, StartLine: start, EndLine: start + count - 1})
		}
		plan.DiffFiles = append(plan.DiffFiles, dryFile)
	}
	return plan
}

func reportDocuments(reports []FindingReport) []any {
	result := make([]any, len(reports))
	for index, report := range reports {
		result[index] = report
	}
	return result
}

func writeFindingReports(output io.Writer, reports []FindingReport, jsonOutput bool) (int, error) {
	if jsonOutput {
		if err := writeJSON(output, reportDocuments(reports), true); err != nil {
			return 2, err
		}
	} else if _, err := io.WriteString(output, humanReports(reports)+"\n"); err != nil {
		return 2, err
	}
	if hasActionableFindings(reports) {
		return 1, nil
	}
	return 0, nil
}

func writeJSON(output io.Writer, value any, indent bool) error {
	encoder := json.NewEncoder(output)
	encoder.SetEscapeHTML(false)
	if indent {
		encoder.SetIndent("", "  ")
	}
	if err := encoder.Encode(value); err != nil {
		return fmt.Errorf("write semantic lint report: %w", err)
	}
	return nil
}

var classifications = []string{"violation", "review", "pass", "not_applicable", "insufficient_evidence"}

func humanReports(reports []FindingReport) string {
	parts := make([]string, len(reports))
	for index, report := range reports {
		counts := make(map[string]int)
		for _, finding := range report.Findings {
			counts[finding.Classification]++
		}
		summary := make([]string, len(classifications))
		for position, classification := range classifications {
			summary[position] = classification + "=" + strconv.Itoa(counts[classification])
		}
		lines := []string{"Source file: " + report.Source, strings.Join(summary, " ")}
		actionable := 0
		for _, finding := range report.Findings {
			if finding.Classification == "pass" || finding.Classification == "not_applicable" {
				continue
			}
			actionable++
			probability := ""
			if finding.ViolationProbability != nil {
				probability = " " + strconv.FormatFloat(*finding.ViolationProbability, 'f', -1, 64)
			}
			lines = append(lines, fmt.Sprintf("[%s%s] %s (%s)", finding.Classification, probability, finding.RuleTitle, finding.RulePath), "  "+finding.Message)
			if finding.Routing != nil && len(finding.Routing.SelectedEvidenceIDs) > 0 {
				lines = append(lines, "  routed evidence "+strings.Join(finding.Routing.SelectedEvidenceIDs, ", "))
			}
			for _, evidence := range finding.Evidence {
				location := "  at " + evidence.Path
				if evidence.StartLine != 0 {
					location += fmt.Sprintf(":%d-%d", evidence.StartLine, max(evidence.EndLine, evidence.StartLine))
				}
				if evidence.RelevanceProbability != 0 {
					location += fmt.Sprintf(" relevance=%.2f", evidence.RelevanceProbability)
				}
				lines = append(lines, location)
			}
		}
		if actionable == 0 {
			lines = append(lines, "No findings.")
		}
		parts[index] = strings.Join(lines, "\n")
	}
	return strings.Join(parts, "\n\n")
}

func hasActionableFindings(reports []FindingReport) bool {
	for _, report := range reports {
		for _, finding := range report.Findings {
			if finding.Classification == "violation" || finding.Classification == "review" || finding.Classification == "insufficient_evidence" {
				return true
			}
		}
	}
	return false
}
