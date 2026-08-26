package require_export_jsdoc

import (
	"regexp"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/parser"
)

var whenWord = regexp.MustCompile(`(?i)(^|[^\pL\pM\pN_])when([^\pL\pM\pN_]|$)`)

var message = rule.RuleMessage{
	Id:          "requireExportJSDoc",
	Description: "Exports need JSDoc that explains when to use them.",
	Help:        "Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.",
}

func hasWhenJSDoc(factory *ast.NodeFactory, source string, node *ast.Node) bool {
	for _, comment := range parser.GetJSDocCommentRanges(factory, nil, node, source) {
		if whenWord.MatchString(source[comment.Pos():comment.End()]) {
			return true
		}
	}
	return false
}

var Rule = rule.Rule{
	Name: "require-export-jsdoc",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		factory := ast.NewNodeFactory(ast.NodeFactoryHooks{})
		check := func(reportNode *ast.Node, documentationNode *ast.Node) {
			if hasWhenJSDoc(factory, ctx.SourceFile.Text(), documentationNode) {
				return
			}
			ctx.ReportNode(reportNode, message)
		}
		return rule.RuleListeners{
			ast.KindExportKeyword: func(node *ast.Node) {
				if node.Parent == nil || node.Flags&ast.NodeFlagsReparsed != 0 {
					return
				}
				check(node, node.Parent)
			},
			ast.KindExportDeclaration: func(node *ast.Node) { check(node, node) },
			ast.KindExportAssignment:  func(node *ast.Node) { check(node, node) },
		}
	},
}
