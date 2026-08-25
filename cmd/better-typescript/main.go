package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/rules"
)

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

type cliOptions struct {
	filePatterns stringListFlag
	ruleNames    stringListFlag
}

func parseCLIOptions(args []string) (cliOptions, error) {
	var options cliOptions
	flags := flag.NewFlagSet("better-typescript", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	flags.Var(&options.filePatterns, "files", "file glob to analyze; repeat or comma-separate (default: all)")
	flags.Var(&options.ruleNames, "rules", "rule name to run; repeat or comma-separate (default: all)")
	if err := flags.Parse(args); err != nil {
		return cliOptions{}, err
	}
	if flags.NArg() != 0 {
		return cliOptions{}, fmt.Errorf("unexpected arguments: %s", strings.Join(flags.Args(), " "))
	}
	return options, nil
}

func selectRules(names []string) ([]rule.Rule, error) {
	if len(names) == 0 {
		return rules.BuiltinRules, nil
	}
	return selectRuleNames(names)
}

func selectRuleNames(names []string) ([]rule.Rule, error) {
	selected := make(map[string]bool, len(names))
	for _, name := range names {
		selected[name] = true
	}
	available := make(map[string]bool, len(rules.BuiltinRules))
	for _, builtin := range rules.BuiltinRules {
		available[builtin.Name] = true
	}
	unknown := make([]string, 0)
	for name := range selected {
		if !available[name] {
			unknown = append(unknown, name)
		}
	}
	if len(unknown) != 0 {
		sort.Strings(unknown)
		return nil, fmt.Errorf("unknown rules: %s", strings.Join(unknown, ", "))
	}

	result := make([]rule.Rule, 0, len(selected))
	for _, builtin := range rules.BuiltinRules {
		if selected[builtin.Name] {
			result = append(result, builtin)
		}
	}
	return result, nil
}

func run() error {
	options, err := parseCLIOptions(os.Args[1:])
	if errors.Is(err, flag.ErrHelp) {
		fmt.Fprintln(os.Stdout, "Usage: better-typescript [--files glob] [--rules name]")
		fmt.Fprintln(os.Stdout, "Repeat flags or separate values with commas. better-typescript.json supplies per-file rule overrides.")
		return nil
	}
	if err != nil {
		return err
	}
	root, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get current directory: %w", err)
	}
	root, err = filepath.Abs(root)
	if err != nil {
		return fmt.Errorf("resolve current directory: %w", err)
	}

	selectedRules, err := selectRules(options.ruleNames)
	if err != nil {
		return err
	}
	var overrides []analysis.RuleOverride
	if len(options.ruleNames) == 0 {
		overrides, err = loadRuleOverrides(root)
		if err != nil {
			return err
		}
	}

	fmt.Fprintf(os.Stderr, "Analyzing %s.\n", root)

	violations, err := analysis.RunWithRuleOverrides(root, selectedRules, overrides, options.filePatterns...)
	if err != nil {
		return err
	}

	writer := bufio.NewWriter(os.Stdout)
	encoder := json.NewEncoder(writer)
	encoder.SetEscapeHTML(false)
	for _, violation := range violations {
		if err := encoder.Encode(violation); err != nil {
			return fmt.Errorf("write violation: %w", err)
		}
	}
	return writer.Flush()
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
