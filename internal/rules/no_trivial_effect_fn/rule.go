package no_trivial_effect_fn

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"strings"
)

var Rule = rule.Rule{
	Name: "no-trivial-effect-fn",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if declaration.Initializer == nil || !ast.IsIdentifier(declaration.Name()) {
				return
			}
			generator := effectFnGenerator(ctx, declaration.Initializer)
			if generator == nil || !isExactForwarder(ctx, generator) || isServiceOperation(ctx, node, declaration.Name()) {
				return
			}
			ctx.ReportNode(declaration.Name(), rule.RuleMessage{Id: "no-trivial-effect-fn", Description: "Avoid named Effect.fn wrappers that only forward their parameters.", Help: "Export the forwarded Effect operation directly. Keep Effect.fn only when the named workflow transforms, recovers, sequences, or otherwise adds behavior."})
		}}
	},
}

func effectFnGenerator(ctx rule.RuleContext, initializer *ast.Node) *ast.Node {
	initializer = unwrap(initializer)
	if !ast.IsCallExpression(initializer) {
		return nil
	}
	outer := initializer.AsCallExpression()
	if len(outer.Arguments.Nodes) != 1 || !ast.IsFunctionExpression(outer.Arguments.Nodes[0]) {
		return nil
	}
	innerNode := unwrap(outer.Expression)
	if !ast.IsCallExpression(innerNode) {
		return nil
	}
	inner := innerNode.AsCallExpression()
	if !isEffectMember(ctx, unwrap(inner.Expression), "fn") {
		return nil
	}
	generator := outer.Arguments.Nodes[0]
	function := generator.AsFunctionExpression()
	if function.AsteriskToken == nil || function.Body == nil || !ast.IsBlock(function.Body) {
		return nil
	}
	statements := function.Body.AsBlock().Statements.Nodes
	if len(statements) != 1 || !ast.IsReturnStatement(statements[0]) {
		return nil
	}
	expression := unwrap(statements[0].AsReturnStatement().Expression)
	if !ast.IsYieldExpression(expression) || expression.AsYieldExpression().AsteriskToken == nil {
		return nil
	}
	return generator
}
func isExactForwarder(ctx rule.RuleContext, generator *ast.Node) bool {
	function := generator.AsFunctionExpression()
	statement := function.Body.AsBlock().Statements.Nodes[0].AsReturnStatement()
	yielded := unwrap(statement.Expression).AsYieldExpression().Expression
	yielded = unwrap(yielded)
	if !ast.IsCallExpression(yielded) {
		return false
	}
	arguments := yielded.AsCallExpression().Arguments.Nodes
	if len(arguments) != len(function.Parameters.Nodes) {
		return false
	}
	for index, parameter := range function.Parameters.Nodes {
		name := parameter.Name()
		if !ast.IsIdentifier(name) || parameter.AsParameterDeclaration().Initializer != nil {
			return false
		}
		argument := unwrap(arguments[index])
		if parameter.AsParameterDeclaration().DotDotDotToken != nil {
			if !ast.IsSpreadElement(argument) {
				return false
			}
			argument = unwrap(argument.AsSpreadElement().Expression)
		}
		if !ast.IsIdentifier(argument) || argument.Text() != name.Text() {
			return false
		}
	}
	return true
}
func isEffectMember(ctx rule.RuleContext, expression *ast.Node, name string) bool {
	if !ast.IsPropertyAccessExpression(expression) || expression.AsPropertyAccessExpression().Name().Text() != name {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(expression.AsPropertyAccessExpression().Name())
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	return symbol != nil && declaredInEffect(symbol)
}
func declaredInEffect(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && isEffectDeclarationFile(file.FileName()) {
			return true
		}
	}
	return false
}
func isServiceOperation(ctx rule.RuleContext, declaration, name *ast.Node) bool {
	for current := declaration.Parent; current != nil; current = current.Parent {
		if ast.IsClassDeclaration(current) {
			found := false
			current.ForEachChild(func(child *ast.Node) bool {
				if ast.IsPropertyAccessExpression(child) && isEffectMember(ctx, child, "Service") {
					found = true
					return true
				}
				return false
			})
			if found {
				return true
			}
		}
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(name)
	if symbol == nil {
		return false
	}
	found := false
	ctx.SourceFile.Node.ForEachChild(func(child *ast.Node) bool {
		if serviceReference(ctx, symbol, child) {
			found = true
			return true
		}
		return false
	})
	return found
}
func serviceReference(ctx rule.RuleContext, symbol *ast.Symbol, node *ast.Node) bool {
	if ast.IsIdentifier(node) && ctx.TypeChecker.GetSymbolAtLocation(node) == symbol && node.Parent != nil {
		property := node.Parent
		if ast.IsShorthandPropertyAssignment(property) || (ast.IsPropertyAssignment(property) && property.Initializer() == node) {
			object := property.Parent
			if ast.IsObjectLiteralExpression(object) {
				for current := object.Parent; current != nil; current = current.Parent {
					if ast.IsCallExpression(current) {
						callee := unwrap(current.AsCallExpression().Expression)
						if ast.IsPropertyAccessExpression(callee) {
							method := callee.AsPropertyAccessExpression().Name().Text()
							if method == "of" || isEffectMember(ctx, callee, "succeed") {
								return true
							}
						}
					}
					if !ast.IsCallExpression(current) && !ast.IsParenthesizedExpression(current) {
						break
					}
				}
			}
		}
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if serviceReference(ctx, symbol, child) {
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
		case ast.KindNonNullExpression:
			node = node.AsNonNullExpression().Expression
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
