package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
)

const configFileName = "better-typescript.json"

type ruleNameList []string

func (names *ruleNameList) UnmarshalJSON(data []byte) error {
	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		single = strings.TrimSpace(single)
		if single == "" {
			return fmt.Errorf("rule id must not be empty")
		}
		*names = ruleNameList{single}
		return nil
	}

	var many []string
	if err := json.Unmarshal(data, &many); err != nil || many == nil {
		return fmt.Errorf("rules must be a string or list of strings")
	}
	for index := range many {
		many[index] = strings.TrimSpace(many[index])
		if many[index] == "" {
			return fmt.Errorf("rule id must not be empty")
		}
	}
	*names = many
	return nil
}

type configOverride struct {
	Files string        `json:"files"`
	Rules *ruleNameList `json:"rules"`
}

type configFile struct {
	Overrides []configOverride `json:"overrides"`
}

func loadRuleOverrides(root string) ([]analysis.RuleOverride, error) {
	fileName := filepath.Join(root, configFileName)
	content, err := os.ReadFile(fileName)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", configFileName, err)
	}

	var config *configFile
	decoder := json.NewDecoder(bytes.NewReader(content))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&config); err != nil {
		return nil, fmt.Errorf("parse %s: %w", configFileName, err)
	}
	if config == nil {
		return nil, fmt.Errorf("parse %s: expected an object", configFileName)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return nil, fmt.Errorf("parse %s: expected one JSON value", configFileName)
	}

	overrides := make([]analysis.RuleOverride, len(config.Overrides))
	for index, entry := range config.Overrides {
		if entry.Files == "" {
			return nil, fmt.Errorf("parse %s: overrides[%d].files must not be empty", configFileName, index)
		}
		if filepath.IsAbs(entry.Files) {
			return nil, fmt.Errorf("parse %s: overrides[%d].files must be project-relative", configFileName, index)
		}
		if err := analysis.ValidateFilePattern(entry.Files); err != nil {
			return nil, fmt.Errorf("parse %s: overrides[%d]: %w", configFileName, index, err)
		}
		if entry.Rules == nil {
			return nil, fmt.Errorf("parse %s: overrides[%d].rules is required", configFileName, index)
		}
		selectedRules, err := selectRuleNames(*entry.Rules)
		if err != nil {
			return nil, fmt.Errorf("parse %s: overrides[%d]: %w", configFileName, index, err)
		}
		overrides[index] = analysis.RuleOverride{
			FilePattern: entry.Files,
			Rules:       selectedRules,
		}
	}
	return overrides, nil
}
