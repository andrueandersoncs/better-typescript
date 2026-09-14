package no_shape_in_symbol_names

import (
	"fmt"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

func borrowedMemberName(node *ast.Node) bool {
	parent := node.Parent
	return parent != nil && ast.IsPropertyAccessExpression(parent) && parent.AsPropertyAccessExpression().Name() == node
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		name := node.Text()
		if !strings.Contains(strings.ToLower(name), "shape") || borrowedMemberName(node) {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{
			Id:          "no-shape-in-symbol-names",
			Description: fmt.Sprintf("Rename symbol `%s` for its domain role.", name),
			Help:        "`shape` describes structure rather than ownership.",
		})
	}
	return rule.RuleListeners{
		ast.KindIdentifier:        check,
		ast.KindPrivateIdentifier: check,
	}
}

var Rule = rule.Rule{Name: "no-shape-in-symbol-names", Run: run}
