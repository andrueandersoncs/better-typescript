package no_raw_object_types

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var parameterMessage = rule.RuleMessage{Id: "no-raw-object-types", Description: "Parameter uses an anonymous object type instead of a named type.", Help: "Reuse a named data structure that already expresses this value's semantics. If none exists, reconsider whether this function is a real abstraction or a procedural seam that should be collapsed into its owner. Introduce a new model only when the data has meaning independent of this parameter list; never replace it with another anonymous object type."}
var returnMessage = rule.RuleMessage{Id: "no-raw-object-types", Description: "Return type uses an anonymous object type instead of a named type.", Help: "Define a named type or interface that describes the data's domain meaning — for example UserProfile instead of { name: string, age: number }. Name the type after what the data represents, not its structural role (avoid names like FooResult or BarResponse)."}
var Rule = rule.Rule{Name: "no-raw-object-types", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	parameter := func(node *ast.Node) {
		if containsRaw(node.AsParameterDeclaration().Type) {
			ctx.ReportNode(node, parameterMessage)
		}
	}
	returns := func(node *ast.Node) {
		if !containsRaw(node.Type()) {
			return
		}
		target := node
		if name := node.Name(); name != nil {
			target = name
		}
		ctx.ReportNode(target, returnMessage)
	}
	return rule.RuleListeners{
		ast.KindParameter:           parameter,
		ast.KindFunctionDeclaration: returns, ast.KindFunctionExpression: returns, ast.KindArrowFunction: returns,
		ast.KindMethodDeclaration: returns, ast.KindMethodSignature: returns, ast.KindCallSignature: returns,
		ast.KindFunctionType: returns, ast.KindGetAccessor: returns,
	}
}
func containsRaw(node *ast.Node) bool {
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindTypeLiteral, ast.KindObjectKeyword:
		return true
	case ast.KindUnionType:
		for _, part := range node.AsUnionTypeNode().Types.Nodes {
			if containsRaw(part) {
				return true
			}
		}
	case ast.KindIntersectionType:
		for _, part := range node.AsIntersectionTypeNode().Types.Nodes {
			if containsRaw(part) {
				return true
			}
		}
	case ast.KindParenthesizedType:
		return containsRaw(node.AsParenthesizedTypeNode().Type)
	}
	return false
}
