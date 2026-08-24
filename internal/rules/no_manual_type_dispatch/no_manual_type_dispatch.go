package no_manual_type_dispatch

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{Id: "no-manual-type-dispatch", Description: "Avoid dispatching on a value with a chain of if statements that each return.", Help: "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile error rather than a silent fall-through."}
var Rule = rule.Rule{Name: "no-manual-type-dispatch", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindIfStatement: func(node *ast.Node) {
		if !isGuard(node) || node.Parent == nil || node.Parent.Kind != ast.KindBlock {
			return
		}
		statements := node.Parent.AsBlock().Statements.Nodes
		index := -1
		for i, statement := range statements {
			if statement == node {
				index = i
				break
			}
		}
		if index < 0 || continues(statements, index, -1) {
			return
		}
		length := 1
		for continues(statements, index+length-1, 1) {
			length++
		}
		if length >= 3 {
			ctx.ReportNode(node, message)
		}
	}}
}
func continues(statements []*ast.Node, index int, offset int) bool {
	otherIndex := index + offset
	if index < 0 || index >= len(statements) || otherIndex < 0 || otherIndex >= len(statements) {
		return false
	}
	current, other := statements[index], statements[otherIndex]
	if !isGuard(current) || !isGuard(other) {
		return false
	}
	names := identifierNames(current.AsIfStatement().Expression)
	for name := range identifierNames(other.AsIfStatement().Expression) {
		if names[name] {
			return true
		}
	}
	return false
}
func identifierNames(node *ast.Node) map[string]bool {
	names := map[string]bool{}
	var visit ast.Visitor
	visit = func(child *ast.Node) bool {
		if child.Kind == ast.KindIdentifier {
			names[child.Text()] = true
		}
		child.ForEachChild(visit)
		return false
	}
	if node.Kind == ast.KindIdentifier {
		names[node.Text()] = true
	}
	node.ForEachChild(visit)
	return names
}
func isGuard(node *ast.Node) bool {
	return node != nil && node.Kind == ast.KindIfStatement && node.AsIfStatement().ElseStatement == nil && alwaysExits(node.AsIfStatement().ThenStatement)
}
func alwaysExits(node *ast.Node) bool {
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindBreakStatement, ast.KindContinueStatement, ast.KindReturnStatement, ast.KindThrowStatement:
		return true
	case ast.KindBlock:
		statements := node.AsBlock().Statements.Nodes
		return len(statements) > 0 && alwaysExits(statements[len(statements)-1])
	}
	return false
}
