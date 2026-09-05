package scoped_client_cache

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "scopedClientCache",
	Description: "Do not acquire a scoped resource inside an ordinary Cache lookup.",
	Help:        "Acquire the resource in its owning layer and let lookup use the shared client.",
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func effectMember(ctx rule.RuleContext, node *ast.Node, file, name string) bool {
	node = unwrap(node)
	var target *ast.Node
	switch {
	case ast.IsPropertyAccessExpression(node):
		target = node.AsPropertyAccessExpression().Name()
	case ast.IsIdentifier(node):
		target = node
	default:
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, target)
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		source := ast.GetSourceFileOfNode(declaration)
		if source == nil {
			continue
		}
		path := strings.ReplaceAll(source.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == file+".ts" || base == file+".d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func lookupValue(ctx rule.RuleContext, node *ast.Node) bool {
	parent := node.Parent
	if parent == nil {
		return false
	}
	if ast.IsPropertyAssignment(parent) && parent.AsPropertyAssignment().Initializer == node {
		name, ok := ast.TryGetTextOfPropertyName(parent.Name())
		if !ok || name != "lookup" || parent.Parent == nil || !ast.IsObjectLiteralExpression(parent.Parent) || parent.Parent.Parent == nil || !ast.IsCallExpression(parent.Parent.Parent) {
			return false
		}
		return effectMember(ctx, parent.Parent.Parent.AsCallExpression().Expression, "Cache", "make")
	}
	if !ast.IsCallExpression(parent) {
		return false
	}
	call := parent.AsCallExpression()
	return len(call.Arguments.Nodes) > 0 && call.Arguments.Nodes[0] == node &&
		effectMember(ctx, call.Expression, "Cache", "makeWith")
}

func lookupCallback(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsArrowFunction(current) && !ast.IsFunctionExpression(current) {
			continue
		}
		if lookupValue(ctx, current) {
			return current
		}
		parent := current.Parent
		if parent != nil && ast.IsCallExpression(parent) {
			call := parent.AsCallExpression()
			if len(call.Arguments.Nodes) > 0 && call.Arguments.Nodes[0] == current && effectMember(ctx, call.Expression, "Effect", "gen") {
				if lookupValue(ctx, parent) {
					return current
				}
				owner := parent.Parent
				if owner != nil && ast.IsArrowFunction(owner) && owner.Body() == parent && lookupValue(ctx, owner) {
					return owner
				}
				if owner != nil && ast.IsReturnStatement(owner) {
					for owner = owner.Parent; owner != nil; owner = owner.Parent {
						if ast.IsFunctionLike(owner) {
							if lookupValue(ctx, owner) {
								return owner
							}
							break
						}
					}
				}
			}
		}
		return nil
	}
	return nil
}

func executedResource(ctx rule.RuleContext, node, lookup *ast.Node) bool {
	for current := node; current != nil && current != lookup; current = current.Parent {
		parent := current.Parent
		if parent == nil {
			return false
		}
		if ast.IsCallExpression(parent) && effectMember(ctx, parent.AsCallExpression().Expression, "Effect", "succeed") {
			return false
		}
		if ast.IsYieldExpression(parent) {
			return true
		}
		if ast.IsReturnStatement(parent) {
			for owner := parent.Parent; owner != nil; owner = owner.Parent {
				if ast.IsFunctionLike(owner) {
					return owner == lookup
				}
			}
			return false
		}
		if ast.IsVariableDeclaration(parent) || (ast.IsFunctionLike(parent) && parent != lookup) {
			return false
		}
	}
	return lookup != nil && lookup.Body() == node
}

func resourceAcquisition(ctx rule.RuleContext, node *ast.Node) bool {
	return effectMember(ctx, node.AsCallExpression().Expression, "Effect", "acquireRelease")
}

var ScopedClientCacheRule = rule.Rule{
	Name: "scoped-client-cache",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		reported := map[*ast.Node]bool{}
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			lookup := lookupCallback(ctx, node)
			if resourceAcquisition(ctx, node) && lookup != nil && executedResource(ctx, node, lookup) && !reported[lookup] {
				reported[lookup] = true
				ctx.ReportNode(node, message)
			}
		}}
	},
}

var Rule = ScopedClientCacheRule
