package prefer_hash_set

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var constructorMessage = rule.RuleMessage{Id: "prefer-hash-set", Description: "Avoid constructing a built-in Set.", Help: "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or HashSet.empty(). HashSet uses Equal and Hash with structural equality by default. For reference-identity object members, wrap each value in an Equal.equal value that compares the underlying objects with === and returns Hash.random(object) from Hash.symbol. Constructing a Set is permitted only when it is handed to a third-party API that requires one."}
var typeHint = "Use HashSet.HashSet<T> from Effect instead. HashSet uses Equal and Hash with structural equality by default. For reference-identity object members, use an Equal.equal wrapper whose equality compares the underlying objects with === and whose Hash.symbol method returns Hash.random(object). Writing the built-in Set type is permitted only where it mirrors a third-party contract: ambient declarations and values that cross into a third-party call."
var mutableMessage = rule.RuleMessage{Id: "prefer-hash-set", Description: "Avoid Effect's MutableHashSet.", Help: "Use Effect's immutable HashSet instead. Build a HashSet with HashSet.empty(), HashSet.make(), or HashSet.fromIterable(), and return the value from HashSet.add() when updating it."}

func isAmbient(node *ast.Node) bool {
	for n := node; n != nil; n = n.Parent {
		if ast.HasSyntacticModifier(n, ast.ModifierFlagsAmbient) {
			return true
		}
	}
	return false
}

func externalCall(ctx rule.RuleContext, call *ast.CallExpression) bool {
	callee := call.Expression
	var target *ast.Node
	if ast.IsIdentifier(callee) {
		target = callee
	}
	if ast.IsPropertyAccessExpression(callee) {
		target = callee.AsPropertyAccessExpression().Name()
	}
	if target == nil {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(target)
	if symbol == nil {
		return false
	}
	if symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	for _, declaration := range symbol.Declarations {
		if ast.GetSourceFileOfNode(declaration) == ctx.SourceFile {
			return false
		}
	}
	return len(symbol.Declarations) > 0
}
func externalArgument(ctx rule.RuleContext, node *ast.Node) bool {
	current := node
	for current.Parent != nil {
		switch current.Parent.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindNonNullExpression:
			current = current.Parent
			continue
		}
		break
	}
	if current.Parent == nil || !ast.IsCallExpression(current.Parent) {
		return false
	}
	call := current.Parent.AsCallExpression()
	for _, argument := range call.Arguments.Nodes {
		if argument == current && externalCall(ctx, call) {
			return true
		}
	}
	return false
}
func constructionEscapes(ctx rule.RuleContext, node *ast.Node) bool {
	if externalArgument(ctx, node) {
		return true
	}
	if node.Parent == nil || !ast.IsVariableDeclaration(node.Parent) || node.Parent.AsVariableDeclaration().Initializer != node {
		return false
	}
	name := node.Parent.AsVariableDeclaration().Name()
	if !ast.IsIdentifier(name) {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(name)
	escapes := false
	ctx.SourceFile.AsNode().ForEachChild(func(child *ast.Node) bool {
		var walk func(*ast.Node) bool
		walk = func(current *ast.Node) bool {
			if ast.IsIdentifier(current) && current != name && ctx.TypeChecker.GetSymbolAtLocation(current) == symbol && externalArgument(ctx, current) {
				return true
			}
			found := false
			current.ForEachChild(func(n *ast.Node) bool {
				if walk(n) {
					found = true
					return true
				}
				return false
			})
			return found
		}
		if walk(child) {
			escapes = true
			return true
		}
		return false
	})
	return escapes
}

var PreferHashSetRule = rule.Rule{Name: "prefer-hash-set", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	valueSymbol := ctx.TypeChecker.ResolveName("Set", nil, ast.SymbolFlagsValue, false)
	typeSymbols := map[string]*ast.Symbol{"Set": ctx.TypeChecker.ResolveName("Set", nil, ast.SymbolFlagsType, false), "ReadonlySet": ctx.TypeChecker.ResolveName("ReadonlySet", nil, ast.SymbolFlagsType, false)}
	return rule.RuleListeners{
		ast.KindNewExpression: func(node *ast.Node) {
			n := node.AsNewExpression()
			if ast.IsIdentifier(n.Expression) && n.Expression.Text() == "Set" && ctx.TypeChecker.GetSymbolAtLocation(n.Expression) == valueSymbol && !constructionEscapes(ctx, node) {
				ctx.ReportNode(node, constructorMessage)
			}
		},
		ast.KindTypeReference: func(node *ast.Node) {
			if isAmbient(node) {
				return
			}
			n := node.AsTypeReferenceNode()
			if !ast.IsIdentifier(n.TypeName) {
				return
			}
			name := n.TypeName.Text()
			expected := typeSymbols[name]
			if expected != nil && ctx.TypeChecker.GetSymbolAtLocation(n.TypeName) == expected {
				ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-hash-set", Description: "Avoid the built-in " + name + " type.", Help: typeHint})
			}
		},
		ast.KindImportDeclaration: func(node *ast.Node) {
			declaration := node.AsImportDeclaration()
			if declaration.ModuleSpecifier == nil {
				return
			}
			module := declaration.ModuleSpecifier.Text()
			if module == "effect/MutableHashSet" {
				ctx.ReportNode(declaration.ModuleSpecifier, mutableMessage)
				return
			}
			if module != "effect" || declaration.ImportClause == nil {
				return
			}
			bindings := declaration.ImportClause.AsImportClause().NamedBindings
			if bindings == nil || bindings.Kind != ast.KindNamedImports {
				return
			}
			for _, element := range bindings.AsNamedImports().Elements.Nodes {
				specifier := element.AsImportSpecifier()
				imported := specifier.Name().Text()
				target := specifier.Name()
				if specifier.PropertyName != nil {
					imported = specifier.PropertyName.Text()
					target = specifier.PropertyName
				}
				if imported == "MutableHashSet" {
					ctx.ReportNode(target, mutableMessage)
				}
			}
		},
		ast.KindPropertyAccessExpression: func(node *ast.Node) {
			a := node.AsPropertyAccessExpression()
			if ast.IsIdentifier(a.Expression) && a.Expression.Text() == "Effect" && a.Name().Text() == "MutableHashSet" {
				ctx.ReportNode(a.Name(), mutableMessage)
			}
		},
	}
}}

var Rule = PreferHashSetRule
