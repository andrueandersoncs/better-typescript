package analysis

import (
	"path/filepath"

	"github.com/andrueandersoncs/better-typescript/internal/fileglob"
)

type compiledFilePattern struct {
	pattern  fileglob.Pattern
	absolute bool
}

type fileMatcher struct {
	root     string
	patterns []compiledFilePattern
}

func ValidateFilePattern(pattern string) error {
	_, err := newFileMatcher("", []string{pattern})
	return err
}

func newFileMatcher(root string, patterns []string) (fileMatcher, error) {
	compiled := make([]compiledFilePattern, 0, len(patterns))
	for _, pattern := range patterns {
		value, err := fileglob.Compile(pattern)
		if err != nil {
			return fileMatcher{}, err
		}
		compiled = append(compiled, compiledFilePattern{
			pattern:  value,
			absolute: filepath.IsAbs(filepath.FromSlash(pattern)),
		})
	}
	return fileMatcher{root: root, patterns: compiled}, nil
}

func (matcher fileMatcher) matches(fileName string) bool {
	if len(matcher.patterns) == 0 {
		return true
	}

	relativeName, err := filepath.Rel(matcher.root, fileName)
	if err != nil {
		relativeName = fileName
	}
	for _, pattern := range matcher.patterns {
		candidate := relativeName
		if pattern.absolute {
			candidate = fileName
		}
		if pattern.pattern.Match(candidate) {
			return true
		}
	}
	return false
}
