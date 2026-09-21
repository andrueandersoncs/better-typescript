package config

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/fileglob"
)

const FileName = "better-typescript.json"

const (
	ModeDeterministic = "deterministic"
	ModeSemantic      = "semantic"
)

type stringList []string

func (values *stringList) UnmarshalJSON(data []byte) error {
	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		single = strings.TrimSpace(single)
		if single == "" {
			return fmt.Errorf("rule id must not be empty")
		}
		*values = stringList{single}
		return nil
	}

	var many []string
	if err := json.Unmarshal(data, &many); err != nil || many == nil {
		return fmt.Errorf("rule names must be a string or list of strings")
	}
	for index := range many {
		many[index] = strings.TrimSpace(many[index])
		if many[index] == "" {
			return fmt.Errorf("rule id must not be empty")
		}
	}
	*values = many
	return nil
}

type rawCommand struct {
	Mode  string      `json:"mode"`
	Type  string      `json:"type"`
	Files string      `json:"files"`
	Rules *stringList `json:"rules"`
}

type rawFile struct {
	Commands []rawCommand `json:"commands"`
}

type Command struct {
	Mode    string
	Type    string
	Files   string
	Rules   []string
	pattern fileglob.Pattern
}

type File struct {
	Commands []Command
}

func Load(root string) (File, error) {
	content, err := os.ReadFile(filepath.Join(root, FileName))
	if errors.Is(err, os.ErrNotExist) {
		return File{}, nil
	}
	if err != nil {
		return File{}, fmt.Errorf("read %s: %w", FileName, err)
	}
	return Parse(content)
}

func Parse(content []byte) (File, error) {
	var raw *rawFile
	decoder := json.NewDecoder(bytes.NewReader(content))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&raw); err != nil {
		return File{}, fmt.Errorf("parse %s: %w", FileName, err)
	}
	if raw == nil {
		return File{}, fmt.Errorf("parse %s: expected an object", FileName)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return File{}, fmt.Errorf("parse %s: expected one JSON value", FileName)
	}

	result := File{}
	for index, entry := range raw.Commands {
		if err := validateProjectPattern(entry.Files); err != nil {
			return File{}, fmt.Errorf("parse %s: commands[%d].files: %w", FileName, index, err)
		}
		compiled, err := fileglob.Compile(entry.Files)
		if err != nil {
			return File{}, fmt.Errorf("parse %s: commands[%d]: %w", FileName, index, err)
		}
		mode := entry.Mode
		if mode == "" {
			mode = ModeDeterministic
		}
		if mode != ModeDeterministic && mode != ModeSemantic {
			return File{}, fmt.Errorf(`parse %s: commands[%d].mode must be "deterministic" or "semantic"`, FileName, index)
		}
		switch entry.Type {
		case "add_inclusions", "add_exclusions":
		default:
			return File{}, fmt.Errorf(`parse %s: commands[%d].type must be "add_exclusions" or "add_inclusions"`, FileName, index)
		}
		if entry.Rules == nil {
			return File{}, fmt.Errorf("parse %s: commands[%d].rules is required", FileName, index)
		}
		result.Commands = append(result.Commands, Command{
			Mode: mode, Type: entry.Type, Files: entry.Files,
			Rules: append([]string(nil), (*entry.Rules)...), pattern: compiled,
		})
	}
	return result, nil
}

func validateProjectPattern(pattern string) error {
	if pattern == "" {
		return fmt.Errorf("must not be empty")
	}
	if filepath.IsAbs(filepath.FromSlash(pattern)) {
		return fmt.Errorf("must be project-relative")
	}
	cleaned := filepath.ToSlash(filepath.Clean(filepath.FromSlash(pattern)))
	if cleaned == ".." || strings.HasPrefix(cleaned, "../") {
		return fmt.Errorf("must stay within the project")
	}
	return nil
}

func (command Command) Matches(path string) bool {
	return command.pattern.Match(path)
}
