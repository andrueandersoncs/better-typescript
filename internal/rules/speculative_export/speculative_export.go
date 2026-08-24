package speculative_export

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

type referenceIndexKey struct{}

type referenceLocation struct {
	file          *ast.SourceFile
	multipleFiles bool
}

func speculativeMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{Id: "speculativeExport", Description: name + " is exported without an independent first-party consumer or established boundary.", Help: "Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis."}
}

func externallyReferenced(ctx rule.RuleContext, name string) bool {
	if asciiWord(name) {
		location, found := projectReferences(ctx)[name]
		return found && (location.multipleFiles || location.file != ctx.SourceFile)
	}
	pattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(name) + `\b`)
	for _, source := range ctx.Program.SourceFiles() {
		if source == ctx.SourceFile || source.IsDeclarationFile || strings.Contains(source.FileName(), "/node_modules/") {
			continue
		}
		if pattern.MatchString(source.Text()) {
			return true
		}
	}
	return false
}

func projectReferences(ctx rule.RuleContext) map[string]referenceLocation {
	return rule.ProgramCacheValue(ctx, referenceIndexKey{}, func() map[string]referenceLocation {
		result := make(map[string]referenceLocation)
		for _, source := range ctx.Program.SourceFiles() {
			if source.IsDeclarationFile || strings.Contains(source.FileName(), "/node_modules/") {
				continue
			}
			seen := make(map[string]struct{})
			forEachWord(source.Text(), func(word string) {
				if _, found := seen[word]; found {
					return
				}
				seen[word] = struct{}{}
				location, found := result[word]
				if !found {
					result[word] = referenceLocation{file: source}
				} else if location.file != source {
					location.multipleFiles = true
					result[word] = location
				}
			})
		}
		return result
	})
}

func asciiWord(text string) bool {
	if text == "" {
		return false
	}
	for index := range len(text) {
		if !wordByte(text[index]) {
			return false
		}
	}
	return true
}

func forEachWord(text string, visit func(string)) {
	start := -1
	for index := 0; index <= len(text); index++ {
		if index < len(text) && wordByte(text[index]) {
			if start == -1 {
				start = index
			}
			continue
		}
		if start != -1 {
			visit(text[start:index])
			start = -1
		}
	}
}

func wordByte(value byte) bool {
	return value >= 'a' && value <= 'z' || value >= 'A' && value <= 'Z' || value >= '0' && value <= '9' || value == '_'
}

var SpeculativeExportRule = rule.Rule{Name: "speculative-export", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		if !ast.HasSyntacticModifier(node, ast.ModifierFlagsExport) || node.Name() == nil {
			return
		}
		name := node.Name().Text()
		if externallyReferenced(ctx, name) {
			return
		}
		ctx.ReportNode(node.Name(), speculativeMessage(name))
	}
	return rule.RuleListeners{ast.KindInterfaceDeclaration: check, ast.KindTypeAliasDeclaration: check, ast.KindClassDeclaration: check}
}}

var Rule = SpeculativeExportRule
