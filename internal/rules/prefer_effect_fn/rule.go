package prefer_effect_fn

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
	"strings"
)

var Rule = rule.Rule{Name: "prefer-effect-fn", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	listener := func(node *ast.Node) {
		if !isFunction(node) || node.BodyData().AsteriskToken != nil || hasModifier(node, ast.KindAsyncKeyword) || !returnsEffectGen(ctx, node) {
			return
		}
		nameNode := functionNameNode(node)
		name := "this function"
		target := node
		if nameNode != nil {
			name = scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, nameNode, false)
			target = nameNode
		}
		ctx.ReportNode(target, rule.RuleMessage{Id: "prefer-effect-fn", Description: fmt.Sprintf("Avoid wrapping the body of %s in Effect.gen; use Effect.fn.", name), Help: "Use Effect.fn for the outer function and move the generator body out of Effect.gen. Preserve any self/this binding on the Effect.fn call."})
	}
	return rule.RuleListeners{ast.KindArrowFunction: listener, ast.KindFunctionDeclaration: listener, ast.KindFunctionExpression: listener, ast.KindMethodDeclaration: listener}
}}

func isFunction(n *ast.Node) bool {
	return ast.IsArrowFunction(n) || ast.IsFunctionDeclaration(n) || ast.IsFunctionExpression(n) || ast.IsMethodDeclaration(n)
}
func hasModifier(n *ast.Node, kind ast.Kind) bool {
	mods := n.Modifiers()
	if mods == nil {
		return false
	}
	for _, m := range mods.Nodes {
		if m.Kind == kind {
			return true
		}
	}
	return false
}
func functionNameNode(n *ast.Node) *ast.Node {
	if n.Parent != nil && (ast.IsVariableDeclaration(n.Parent) || ast.IsPropertyAssignment(n.Parent) || ast.IsPropertyDeclaration(n.Parent)) {
		return n.Parent.Name()
	}
	return ast.GetNameOfDeclaration(n)
}
func returnsEffectGen(ctx rule.RuleContext, owner *ast.Node) bool {
	body := owner.BodyData().Body
	if body == nil {
		return false
	}
	if !ast.IsBlock(body) {
		return expressionIsEffectGen(ctx, owner, body, map[*ast.Symbol]bool{})
	}
	found := false
	walkOwned(body, owner, func(statement *ast.Node) {
		if ast.IsReturnStatement(statement) && statement.AsReturnStatement().Expression != nil && expressionIsEffectGen(ctx, owner, statement.AsReturnStatement().Expression, map[*ast.Symbol]bool{}) {
			found = true
		}
	})
	return found
}

func walkOwned(node, owner *ast.Node, visit func(*ast.Node)) {
	visit(node)
	for child := range node.IterChildren() {
		if child != owner && isFunction(child) {
			continue
		}
		walkOwned(child, owner, visit)
	}
}

func expressionIsEffectGen(ctx rule.RuleContext, owner, node *ast.Node, seen map[*ast.Symbol]bool) bool {
	node = unwrap(node)
	if ast.IsConditionalExpression(node) {
		conditional := node.AsConditionalExpression()
		return expressionIsEffectGen(ctx, owner, conditional.WhenTrue, seen) || expressionIsEffectGen(ctx, owner, conditional.WhenFalse, seen)
	}
	if ast.IsCallExpression(node) {
		return referencesEffectGen(ctx, node.AsCallExpression().Expression, nil, map[*ast.Symbol]bool{})
	}
	if !ast.IsIdentifier(node) {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || seen[symbol] {
		return false
	}
	seen[symbol] = true
	for _, declaration := range symbol.Declarations {
		if !ast.IsVariableDeclaration(declaration) || declaration.AsVariableDeclaration().Initializer == nil || declaration.Parent == nil || declaration.Parent.Flags&ast.NodeFlagsConst == 0 {
			continue
		}
		if enclosingFunction(declaration) != owner {
			continue
		}
		if expressionIsEffectGen(ctx, owner, declaration.AsVariableDeclaration().Initializer, seen) {
			return true
		}
	}
	return false
}

func referencesEffectGen(ctx rule.RuleContext, node *ast.Node, members []string, seen map[*ast.Symbol]bool) bool {
	node = unwrap(node)
	if ast.IsPropertyAccessExpression(node) {
		return referencesEffectGen(ctx, node.AsPropertyAccessExpression().Expression, append([]string{propertyName(node)}, members...), seen)
	}
	if ast.IsElementAccessExpression(node) {
		argument := unwrap(node.AsElementAccessExpression().ArgumentExpression)
		if ast.IsStringLiteralLike(argument) {
			return referencesEffectGen(ctx, node.AsElementAccessExpression().Expression, append([]string{argument.Text()}, members...), seen)
		}
		return false
	}
	if !ast.IsIdentifier(node) {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	resolved := symbol
	if resolved != nil && resolved.Flags&ast.SymbolFlagsAlias != 0 {
		resolved = ctx.TypeChecker.GetAliasedSymbol(resolved)
	}
	if len(members) > 0 && members[len(members)-1] == "gen" && symbolInEffect(resolved) {
		return true
	}
	if len(members) == 0 && resolved != nil && resolved.Name == "gen" && symbolInEffect(resolved) {
		return true
	}
	if symbol == nil || seen[symbol] {
		return false
	}
	seen[symbol] = true
	for _, declaration := range symbol.Declarations {
		if ast.IsVariableDeclaration(declaration) && declaration.Parent != nil && declaration.Parent.Flags&ast.NodeFlagsConst != 0 && declaration.AsVariableDeclaration().Initializer != nil {
			if referencesEffectGen(ctx, declaration.AsVariableDeclaration().Initializer, members, seen) {
				return true
			}
		}
		if ast.IsBindingElement(declaration) {
			binding := declaration.AsBindingElement()
			if declaration.Parent == nil || declaration.Parent.Parent == nil || !ast.IsVariableDeclaration(declaration.Parent.Parent) {
				continue
			}
			variable := declaration.Parent.Parent
			if variable.Parent == nil || variable.Parent.Flags&ast.NodeFlagsConst == 0 || variable.AsVariableDeclaration().Initializer == nil {
				continue
			}
			property := binding.PropertyName
			if property == nil {
				property = declaration.Name()
			}
			if property != nil && ast.IsIdentifier(property) && referencesEffectGen(ctx, variable.AsVariableDeclaration().Initializer, append([]string{property.AsIdentifier().Text}, members...), seen) {
				return true
			}
		}
	}
	return false
}

func symbolInEffect(symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil && strings.Contains(strings.ReplaceAll(file.FileName(), "\\", "/"), "/node_modules/effect/") {
			return true
		}
	}
	return false
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for node = node.Parent; node != nil; node = node.Parent {
		if isFunction(node) {
			return node
		}
	}
	return nil
}

func propertyName(n *ast.Node) string {
	name := n.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
}
func unwrap(n *ast.Node) *ast.Node {
	for n != nil {
		switch n.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			n = n.Expression()
		default:
			return n
		}
	}
	return n
}

var PreferEffectFnRule = Rule
