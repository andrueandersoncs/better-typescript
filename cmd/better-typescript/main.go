package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/rules"
)

func run() error {
	root, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get current directory: %w", err)
	}
	root, err = filepath.Abs(root)
	if err != nil {
		return fmt.Errorf("resolve current directory: %w", err)
	}
	fmt.Fprintf(os.Stderr, "Analyzing %s.\n", root)

	violations, err := analysis.Run(root, rules.BuiltinRules)
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
