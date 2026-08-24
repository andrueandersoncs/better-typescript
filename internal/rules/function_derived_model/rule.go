package function_derived_model

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var suffixes = []string{"Context", "Data", "Info", "Input", "Model", "Options", "Output", "Params", "Result", "State"}

type functionEntry struct {
	name string
	node *ast.Node
	file *ast.SourceFile
}

type functionIndexKey struct{}

var Rule = rule.Rule{Name: "function-derived-model", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	functions := projectFunctions(ctx)
	inspect := func(node *ast.Node) {
		nameNode := node.Name()
		if nameNode == nil {
			return
		}
		name := nameNode.Text()
		stem := ""
		for _, suffix := range suffixes {
			if strings.HasSuffix(name, suffix) && len(name) > len(suffix) {
				stem = strings.TrimSuffix(name, suffix)
				break
			}
		}
		if stem == "" {
			return
		}
		for _, fn := range functions {
			if strings.EqualFold(fn.name, stem) && strings.Contains(nodeText(fn.file, fn.node), name) {
				ctx.ReportNode(nameNode, rule.RuleMessage{Id: "function-derived-model", Description: name + " is named after its sole function role instead of independent semantics.", Help: "Remove or deepen the function-data abstraction, or replace this structural-role name with an existing domain concept. A new name must mean more than input, output, options, context, state, or result for one function."})
				return
			}
		}
	}
	return rule.RuleListeners{ast.KindInterfaceDeclaration: inspect, ast.KindTypeAliasDeclaration: inspect}
}}

func projectFunctions(ctx rule.RuleContext) []functionEntry {
	return rule.ProgramCacheValue(ctx, functionIndexKey{}, func() []functionEntry {
		var result []functionEntry
		for _, file := range ctx.Program.SourceFiles() {
			if strings.Contains(file.FileName(), "node_modules") || strings.HasSuffix(file.FileName(), ".d.ts") {
				continue
			}
			walk(file.AsNode(), func(node *ast.Node) bool {
				if !ast.IsFunctionLike(node) {
					return false
				}
				name := ""
				if ast.IsFunctionDeclaration(node) && node.Name() != nil {
					name = node.Name().Text()
				}
				if name == "" && node.Parent != nil && ast.IsVariableDeclaration(node.Parent) && node.Parent.Name() != nil {
					name, _ = ast.TryGetTextOfPropertyName(node.Parent.Name())
				}
				if name != "" {
					result = append(result, functionEntry{name: name, node: node, file: file})
				}
				return false
			})
		}
		return result
	})
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression:
			node = node.Expression()
		case ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func propertyName(node *ast.Node) (string, *ast.Node, bool) {
	node = unwrap(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return "", nil, false
	}
	return node.Name().Text(), node.AsPropertyAccessExpression().Expression, true
}

func callName(node *ast.Node) (string, *ast.Node, bool) {
	if node == nil || !ast.IsCallExpression(node) {
		return "", nil, false
	}
	call := node.AsCallExpression()
	name, receiver, ok := propertyName(call.Expression)
	if ok {
		return name, receiver, true
	}
	callee := unwrap(call.Expression)
	if callee != nil && ast.IsIdentifier(callee) {
		return callee.Text(), nil, true
	}
	return "", nil, false
}

func nodeText(file *ast.SourceFile, node *ast.Node) string {
	if node == nil {
		return ""
	}
	start, end := node.Pos(), node.End()
	text := file.Text()
	if start < 0 {
		start = 0
	}
	if end > len(text) {
		end = len(text)
	}
	if end < start {
		return ""
	}
	return strings.TrimSpace(text[start:end])
}

func walk(node *ast.Node, visit func(*ast.Node) bool) bool {
	if node == nil {
		return false
	}
	if visit(node) {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if walk(child, visit) {
			found = true
			return true
		}
		return false
	})
	return found
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}
