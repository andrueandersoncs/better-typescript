package require_construction_record_parameter

import (
	"fmt"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var verbs = map[string]bool{"build": true, "construct": true, "create": true, "make": true}

var Rule = rule.Rule{
	Name: "require-construction-record-parameter",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			name, nameNode := constructionName(node)
			if !verbs[name] {
				return
			}
			count := valueParameterCount(node)
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

func constructionName(node *ast.Node) (string, *ast.Node) {
	var name *ast.Node
	if node.Parent != nil && (ast.IsVariableDeclaration(node.Parent) || ast.IsPropertyAssignment(node.Parent) || ast.IsPropertyDeclaration(node.Parent)) {
		name = node.Parent.Name()
	} else {
		name = ast.GetNameOfDeclaration(node)
	}
	if name == nil {
		return "", nil
	}
	text, ok := ast.TryGetTextOfPropertyName(name)
	if !ok {
		return "", nil
	}
	return text, name
}

func valueParameterCount(node *ast.Node) int {
	count := 0
	for _, parameter := range node.Parameters() {
		if ast.IsThisParameter(parameter) {
			continue
		}
		count++
	}
	return count
}
