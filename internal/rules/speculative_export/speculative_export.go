package speculative_export

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

func speculativeMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{Id: "speculativeExport", Description: name + " is exported without an independent first-party consumer or established boundary.", Help: "Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis."}
}
func externallyReferenced(ctx rule.RuleContext, name string) bool {
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
