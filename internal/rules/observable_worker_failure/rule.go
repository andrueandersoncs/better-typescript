package observable_worker_failure

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"strings"
)

var Rule = rule.Rule{
	Name: "observable-worker-failure",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			if !isIgnoreCall(ctx, node) || hasNearbyLogging(node) {
				return
			}
			ctx.ReportNode(node.AsCallExpression().Expression, rule.RuleMessage{Id: "observable-worker-failure", Description: "Make worker failures observable.", Help: "Log expected item failures or make the skip policy explicit at the owning worker boundary."})
		}}
	},
}

func isIgnoreCall(ctx rule.RuleContext, node *ast.Node) bool {
	expression := unwrap(node.AsCallExpression().Expression)
	target := expression
	if ast.IsPropertyAccessExpression(expression) {
		target = expression.AsPropertyAccessExpression().Name()
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(target)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if symbol == nil || (symbol.Name != "ignore" && symbol.Name != "ignoreCause") {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && isEffectDeclarationFile(file.FileName()) {
			return true
		}
	}
	return false
}
func hasNearbyLogging(node *ast.Node) bool {
	owner := node.Parent
	for owner != nil && !isFunctionLike(owner) {
		owner = owner.Parent
	}
	if owner == nil {
		return false
	}
	return containsLogging(owner)
}
func isFunctionLike(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindFunctionDeclaration, ast.KindFunctionExpression, ast.KindArrowFunction, ast.KindMethodDeclaration, ast.KindGetAccessor, ast.KindSetAccessor, ast.KindConstructor:
		return true
	}
	return false
}
func containsLogging(node *ast.Node) bool {
	if ast.IsCallExpression(node) {
		expression := unwrap(node.AsCallExpression().Expression)
		if ast.IsIdentifier(expression) {
			switch expression.Text() {
			case "log", "info", "warn", "error", "debug", "trace":
				return true
			}
		}
		if ast.IsPropertyAccessExpression(expression) {
			switch expression.AsPropertyAccessExpression().Name().Text() {
			case "log", "info", "warn", "error", "debug", "trace", "fatal":
				return true
			}
		}
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if containsLogging(child) {
			found = true
			return true
		}
		return false
	})
	return found
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression:
			node = node.AsAsExpression().Expression
		case ast.KindSatisfiesExpression:
			node = node.AsSatisfiesExpression().Expression
		default:
			return node
		}
	}
	return nil
}

func isEffectDeclarationFile(fileName string) bool {
	path := strings.ReplaceAll(fileName, "\\", "/")
	return strings.Contains(path, "/node_modules/effect/") || strings.HasSuffix(path, "/effect/index.d.ts")
}
