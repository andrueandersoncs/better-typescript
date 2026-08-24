package schema_class_models

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var msg = rule.RuleMessage{Id: "schema-class-models", Description: "Avoid Schema class data models; use Schema.Struct or tagged schema variants.", Help: "Keep ordinary data declarative and decode it at the boundary."}
var Rule = rule.Rule{Name: "schema-class-models", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindClassDeclaration: func(node *ast.Node) {
			text := scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), node, false)
			if strings.Contains(text, "extends Schema.Class") || strings.Contains(text, "extends Schema.TaggedClass") {
				if node.Name() != nil {
					ctx.ReportNode(node.Name(), msg)
				} else {
					ctx.ReportNode(node, msg)
				}
			}
		},
		ast.KindCallExpression: func(node *ast.Node) {
			call := node.AsCallExpression()
			callee := strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), call.Expression, false))
			if ast.IsCallExpression(call.Expression) {
				callee = strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), call.Expression.AsCallExpression().Expression, false))
			}
			if callee != "Schema.Class" && callee != "Schema.TaggedClass" && callee != "Class" && callee != "TaggedClass" {
				return
			}
			if call.Arguments == nil || len(call.Arguments.Nodes) == 0 {
				return
			}
			a := call.Arguments.Nodes[0]
			if ast.IsObjectLiteralExpression(a) || ast.IsIdentifier(a) || ast.IsCallExpression(a) {
				ctx.ReportNode(call.Expression, msg)
			}
		},
	}
}}
