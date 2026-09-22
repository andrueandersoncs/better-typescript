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
  --model <name>           TypeSafe model override (default: provider default)
  --rules-dir <path>       Additional Markdown rules (default: .better-typescript/rules)
  --range <from>..<to>     Analyze complete files from a committed Git range endpoint
  --files <glob>           Analyze selected current files; repeat or comma-separate
  --all                    Analyze all eligible current files
  --rules <name>           Run selected semantic rules; repeat or comma-separate
  --json                   Print machine-readable results
  --dry-run                Inspect files, rules, request partitions, and bytes without API calls
  --help                   Show this help
`

type stringListFlag []string

func (values *stringListFlag) String() string {
	return strings.Join(*values, ",")
}

func (values *stringListFlag) Set(value string) error {
	for item := range strings.SplitSeq(value, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			return fmt.Errorf("value must not be empty")
		}
		*values = append(*values, item)
	}
	return nil
}

type sourceEvaluation struct {
	source Source
	rules  []Rule
}

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
	configuration, err := loadConfiguration(ctx, root, snapshot)
	if err != nil {
		return 2, err
	}
	if options.AllFiles || len(options.FilePatterns) > 0 {
		snapshot, err = selectCurrentFiles(root, snapshot, options.FilePatterns, options.AllFiles)
		if err != nil {
			return 2, err
		}
	}
	sources, err := loadSelectedSources(ctx, root, snapshot)
	if err != nil {
		return 2, err
	}
	if len(sources) == 0 {
		_, err := fmt.Fprintln(output, "No current files to lint.")
		return 0, err
	}
	rules, err := loadRules(root, options.RulesDirectory)
	if err != nil {
		return 2, err
	}
	rules, err = selectSemanticRules(rules, options.RuleNames)
	if err != nil {
		return 2, err
	}
	if len(options.RuleNames) > 0 {
		configuration.Commands = nil
	}
	commands, err := compileSemanticCommands(rules, configuration)
	if err != nil {
		return 2, err
	}
	evaluations := make([]sourceEvaluation, len(sources))
	questionCount := 0
	for index, source := range sources {
		applicable := rulesForPath(rules, commands, source.Path)
		evaluations[index] = sourceEvaluation{source: source, rules: applicable}
		questionCount += len(applicable)
	}
	if options.DryRun {
		plan, err := dryRunPlan(evaluations, options.Model)
		if err != nil {
			return 2, err
		}
		if err := writeJSON(output, plan, true); err != nil {
			return 2, err
		}
		return 0, nil
	}
	if questionCount == 0 {
		return writeFindingReports(output, nil, options.JSON)
	}
	client, err := newTypeSafeClient()
	if err != nil {
		return 2, err
	}
	reports := make([]FindingReport, 0, len(evaluations))
	for _, evaluation := range evaluations {
		if len(evaluation.rules) == 0 {
			continue
		}
		report, err := evaluateSource(ctx, evaluation.source, evaluation.rules, options, client)
		if err != nil {
			return 2, err
		}
		reports = append(reports, report)
	}
	return writeFindingReports(output, reports, options.JSON)
}

func parseOptions(args []string) (Options, bool, error) {
	options := Options{Threshold: defaultThreshold, RulesDirectory: ".better-typescript/rules"}
	var filePatterns, ruleNames stringListFlag
	flags := flag.NewFlagSet("semantic", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	flags.Float64Var(&options.Threshold, "threshold", defaultThreshold, "")
	flags.StringVar(&options.Model, "model", "", "")
	flags.StringVar(&options.RulesDirectory, "rules-dir", options.RulesDirectory, "")
	flags.StringVar(&options.CommitRange, "range", "", "")
	flags.Var(&filePatterns, "files", "")
	flags.BoolVar(&options.AllFiles, "all", false, "")
	flags.Var(&ruleNames, "rules", "")
	flags.BoolVar(&options.JSON, "json", false, "")
	flags.BoolVar(&options.DryRun, "dry-run", false, "")
	help := false
	flags.BoolVar(&help, "help", false, "")
	if err := flags.Parse(args); err != nil {
		return Options{}, false, err
	}
	if flags.NArg() != 0 {
		return Options{}, false, fmt.Errorf("unexpected arguments: %s", strings.Join(flags.Args(), " "))
	}
	options.FilePatterns = append([]string(nil), filePatterns...)
	options.RuleNames = append([]string(nil), ruleNames...)
	targetModes := 0
	if strings.TrimSpace(options.CommitRange) != "" {
		targetModes++
	}
	if len(options.FilePatterns) > 0 {
		targetModes++
	}
	if options.AllFiles {
		targetModes++
	}
	if targetModes > 1 {
		return Options{}, false, fmt.Errorf("--range, --files, and --all cannot be combined")
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
	return options, help, nil
}

func dryRunPlan(evaluations []sourceEvaluation, model string) (DryRunPlan, error) {
	plan := DryRunPlan{Kind: "dry-run-plan", Model: model, Files: make([]DryRunFile, len(evaluations))}
	for index, evaluation := range evaluations {
		file, err := dryRunFile(evaluation.source, evaluation.rules, model)
		if err != nil {
			return DryRunPlan{}, err
		}
		plan.Files[index] = file
	}
	return plan, nil
}

func writeFindingReports(output io.Writer, reports []FindingReport, jsonOutput bool) (int, error) {
	if jsonOutput {
		if err := writeJSON(output, reports, true); err != nil {
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

var classifications = []string{"violation", "review", "pass"}

func humanReports(reports []FindingReport) string {
	if len(reports) == 0 {
		return "No findings."
	}
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
		for _, finding := range report.Findings {
			if finding.Classification == "pass" {
				continue
			}
			lines = append(lines,
				fmt.Sprintf("[%s %s] %s (%s)", finding.Classification, strconv.FormatFloat(finding.ViolationProbability, 'f', -1, 64), finding.RuleTitle, finding.RulePath),
				"  "+finding.Message,
			)
		}
		if counts["violation"]+counts["review"] == 0 {
			lines = append(lines, "No findings.")
		}
		parts[index] = strings.Join(lines, "\n")
	}
	return strings.Join(parts, "\n\n")
}

func hasActionableFindings(reports []FindingReport) bool {
	for _, report := range reports {
		for _, finding := range report.Findings {
			if finding.Classification == "violation" || finding.Classification == "review" {
				return true
			}
		}
	}
	return false
}
