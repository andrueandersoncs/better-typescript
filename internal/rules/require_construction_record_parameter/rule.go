package require_construction_record_parameter

import (
	"fmt"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var Rule = rule.Rule{
	Name: "require-construction-record-parameter",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			name, nameNode, construction := rule.ConstructionName(node)
			if !construction {
				return
			}
			count := rule.ValueParameterCount(node)
			if count < 2 {
				return
			}
			ctx.ReportNode(nameNode, rule.RuleMessage{
				Id:          "require-construction-record-parameter",
				Description: fmt.Sprintf("%s takes %d positional parameters instead of one named record.", name, count),
				Help:        "Replace the positional parameters with one named object parameter so callers pass fields by name.",
			})
		}
		return rule.RuleListeners{
			ast.KindFunctionDeclaration: check,
			ast.KindFunctionExpression:  check,
			ast.KindArrowFunction:       check,
			ast.KindMethodDeclaration:   check,
		}
	},
}
