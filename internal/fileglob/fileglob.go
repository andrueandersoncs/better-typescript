package fileglob

import (
	"fmt"
	"path"
	"path/filepath"
	"strings"
)

// Pattern matches slash-separated paths and treats ** as zero or more segments.
type Pattern struct {
	segments []string
}

func Compile(pattern string) (Pattern, error) {
	pattern = strings.TrimPrefix(filepath.ToSlash(pattern), "./")
	if pattern == "" {
		return Pattern{}, fmt.Errorf("file glob must not be empty")
	}
	patterns, err := expandBraces(pattern)
	if err != nil {
		return Pattern{}, err
	}
	if len(patterns) != 1 {
		return Pattern{}, fmt.Errorf("file glob %q expands to multiple patterns", pattern)
	}
	segments := strings.Split(patterns[0], "/")
	for _, segment := range segments {
		if segment == "**" {
			continue
		}
		if _, err := path.Match(segment, ""); err != nil {
			return Pattern{}, fmt.Errorf("invalid file glob %q: %w", pattern, err)
		}
	}
	return Pattern{segments: segments}, nil
}

func CompileAll(pattern string) ([]Pattern, error) {
	pattern = strings.TrimPrefix(filepath.ToSlash(pattern), "./")
	if pattern == "" {
		return nil, fmt.Errorf("file glob must not be empty")
	}
	expanded, err := expandBraces(pattern)
	if err != nil {
		return nil, err
	}
	patterns := make([]Pattern, 0, len(expanded))
	for _, value := range expanded {
		compiled, err := Compile(value)
		if err != nil {
			return nil, err
		}
		patterns = append(patterns, compiled)
	}
	return patterns, nil
}

func (pattern Pattern) Match(name string) bool {
	name = strings.TrimPrefix(filepath.ToSlash(name), "./")
	return match(pattern.segments, strings.Split(name, "/"))
}

func expandBraces(pattern string) ([]string, error) {
	open := strings.IndexByte(pattern, '{')
	if open < 0 {
		if strings.ContainsRune(pattern, '}') {
			return nil, fmt.Errorf("invalid file glob %q: unmatched brace", pattern)
		}
		return []string{pattern}, nil
	}
	closeOffset := strings.IndexByte(pattern[open+1:], '}')
	if closeOffset < 0 {
		return nil, fmt.Errorf("invalid file glob %q: unmatched brace", pattern)
	}
	close := open + 1 + closeOffset
	values := strings.Split(pattern[open+1:close], ",")
	if len(values) == 0 {
		return nil, fmt.Errorf("invalid file glob %q: empty brace", pattern)
	}
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value == "" {
			return nil, fmt.Errorf("invalid file glob %q: empty brace option", pattern)
		}
		tails, err := expandBraces(pattern[:open] + value + pattern[close+1:])
		if err != nil {
			return nil, err
		}
		result = append(result, tails...)
	}
	return result, nil
}

func match(pattern, name []string) bool {
	type position struct {
		pattern int
		name    int
	}
	memo := map[position]bool{}
	seen := map[position]bool{}
	var visit func(int, int) bool
	visit = func(patternIndex, nameIndex int) bool {
		current := position{pattern: patternIndex, name: nameIndex}
		if seen[current] {
			return memo[current]
		}
		seen[current] = true

		matched := false
		switch {
		case patternIndex == len(pattern):
			matched = nameIndex == len(name)
		case pattern[patternIndex] == "**":
			matched = visit(patternIndex+1, nameIndex) ||
				(nameIndex < len(name) && visit(patternIndex, nameIndex+1))
		case nameIndex < len(name):
			segmentMatched, _ := path.Match(pattern[patternIndex], name[nameIndex])
			matched = segmentMatched && visit(patternIndex+1, nameIndex+1)
		}
		memo[current] = matched
		return matched
	}
	return visit(0, 0)
}
