package prefer_hash_map

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var constructorMessage = rule.RuleMessage{Id: "prefer-hash-map", Description: "Avoid constructing a built-in Map.", Help: "Use Effect's HashMap instead — for example HashMap.fromIterable([[\"a\", 1]]) or HashMap.empty(). HashMap uses Equal and Hash with structural equality by default. For reference-identity object keys, wrap each key in an Equal.equal value that compares the underlying objects with === and returns Hash.random(object) from Hash.symbol. Constructing a Map is permitted only when it is handed to a third-party API that requires one."}
var typeHint = "Use HashMap.HashMap<K, V> from Effect instead. HashMap uses Equal and Hash with structural equality by default. For reference-identity object keys, use an Equal.equal wrapper whose equality compares the underlying objects with === and whose Hash.symbol method returns Hash.random(object). Writing the built-in Map type is permitted only where it mirrors a third-party contract: ambient declarations and values that cross into a third-party call."
var mutableMessage = rule.RuleMessage{Id: "prefer-hash-map", Description: "Avoid Effect's MutableHashMap.", Help: "Use Effect's immutable HashMap instead. Build a HashMap with HashMap.empty(), HashMap.make(), or HashMap.fromIterable(), and return the value from HashMap.set() when updating it."}

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

var PreferHashMapRule = rule.Rule{Name: "prefer-hash-map", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	valueSymbol := ctx.TypeChecker.ResolveName("Map", nil, ast.SymbolFlagsValue, false)
	typeSymbols := map[string]*ast.Symbol{"Map": ctx.TypeChecker.ResolveName("Map", nil, ast.SymbolFlagsType, false), "ReadonlyMap": ctx.TypeChecker.ResolveName("ReadonlyMap", nil, ast.SymbolFlagsType, false)}
	return rule.RuleListeners{
		ast.KindNewExpression: func(node *ast.Node) {
			n := node.AsNewExpression()
			if ast.IsIdentifier(n.Expression) && n.Expression.Text() == "Map" && ctx.TypeChecker.GetSymbolAtLocation(n.Expression) == valueSymbol && !constructionEscapes(ctx, node) {
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
				ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-hash-map", Description: "Avoid the built-in " + name + " type.", Help: typeHint})
			}
		},
		ast.KindImportDeclaration: func(node *ast.Node) {
			declaration := node.AsImportDeclaration()
			if declaration.ModuleSpecifier == nil {
				return
			}
			module := declaration.ModuleSpecifier.Text()
			if module == "effect/MutableHashMap" {
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
				if imported == "MutableHashMap" {
					ctx.ReportNode(target, mutableMessage)
				}
			}
		},
		ast.KindPropertyAccessExpression: func(node *ast.Node) {
			a := node.AsPropertyAccessExpression()
			if ast.IsIdentifier(a.Expression) && a.Expression.Text() == "Effect" && a.Name().Text() == "MutableHashMap" {
				ctx.ReportNode(a.Name(), mutableMessage)
			}
		},
	}
}}

var Rule = PreferHashMapRule
