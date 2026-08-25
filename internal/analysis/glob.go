package analysis

import (
	"fmt"
	"path"
	"path/filepath"
	"strings"
)

type fileMatcher struct {
	root     string
	patterns []string
}

func newFileMatcher(root string, patterns []string) (fileMatcher, error) {
	for _, pattern := range patterns {
		if pattern == "" {
			return fileMatcher{}, fmt.Errorf("file glob must not be empty")
		}
		for _, part := range strings.Split(filepath.ToSlash(pattern), "/") {
			if part == "**" {
				continue
			}
			if _, err := path.Match(part, ""); err != nil {
				return fileMatcher{}, fmt.Errorf("invalid file glob %q: %w", pattern, err)
			}
		}
	}
	return fileMatcher{root: root, patterns: patterns}, nil
}

func (matcher fileMatcher) matches(fileName string) bool {
	if len(matcher.patterns) == 0 {
		return true
	}

	relativeName, err := filepath.Rel(matcher.root, fileName)
	if err != nil {
		relativeName = fileName
	}
	relativeName = filepath.ToSlash(relativeName)
	absoluteName := filepath.ToSlash(fileName)

	for _, pattern := range matcher.patterns {
		pattern = filepath.ToSlash(pattern)
		candidate := relativeName
		if filepath.IsAbs(filepath.FromSlash(pattern)) {
			candidate = absoluteName
		} else {
			pattern = strings.TrimPrefix(pattern, "./")
		}
		if matchGlob(strings.Split(pattern, "/"), strings.Split(candidate, "/")) {
			return true
		}
	}
	return false
}

func matchGlob(pattern, name []string) bool {
	type position struct {
		pattern int
		name    int
	}
	memo := map[position]bool{}
	seen := map[position]bool{}
	var match func(int, int) bool
	match = func(patternIndex, nameIndex int) bool {
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
			matched = match(patternIndex+1, nameIndex) ||
				(nameIndex < len(name) && match(patternIndex, nameIndex+1))
		case nameIndex < len(name):
			segmentMatched, _ := path.Match(pattern[patternIndex], name[nameIndex])
			matched = segmentMatched && match(patternIndex+1, nameIndex+1)
		}
		memo[current] = matched
		return matched
	}
	return match(0, 0)
}
