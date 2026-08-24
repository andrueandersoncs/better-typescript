package prefer_curried_data_last_functions

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var Rule = rule.Rule{Name: "prefer-curried-data-last-functions", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	listener := func(node *ast.Node) {
		if !isFunction(node) || !hasDisallowedParameters(node) || hasCurriedArrowBody(node) || isContextuallyTypedFunction(ctx, node) || hasOnlyContextualUse(ctx, node) {
			return
		}
		target := node
		if ast.IsFunctionDeclaration(node) || ast.IsMethodDeclaration(node) {
			if name := ast.GetNameOfDeclaration(node); name != nil {
				target = name
			}
		}
		ctx.ReportNode(target, rule.RuleMessage{Id: "prefer-curried-data-last-functions", Description: "Avoid rest parameters and multiple runtime parameters in one function.", Help: "Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last."})
	}
	return rule.RuleListeners{ast.KindArrowFunction: listener, ast.KindFunctionDeclaration: listener, ast.KindFunctionExpression: listener, ast.KindMethodDeclaration: listener}
}}

func isFunction(node *ast.Node) bool {
	return ast.IsArrowFunction(node) || ast.IsFunctionDeclaration(node) || ast.IsFunctionExpression(node) || ast.IsMethodDeclaration(node)
}
func runtimeParameters(node *ast.Node) []*ast.ParameterDeclarationNode {
	out := make([]*ast.ParameterDeclarationNode, 0, len(node.Parameters()))
	for _, p := range node.Parameters() {
		name := p.AsNode().Name()
		if name == nil || !ast.IsIdentifier(name) || name.AsIdentifier().Text != "this" {
			out = append(out, p)
		}
	}
	return out
}
func hasRest(node *ast.Node) bool {
	for _, p := range node.Parameters() {
		if p.AsNode().AsParameterDeclaration().DotDotDotToken != nil {
			return true
		}
	}
	return false
}
func hasDisallowedParameters(node *ast.Node) bool {
	return hasRest(node) || len(runtimeParameters(node)) > 1
}
func hasCurriedArrowBody(node *ast.Node) bool {
	if !ast.IsArrowFunction(node) || len(runtimeParameters(node)) != 1 || hasRest(node) {
		return false
	}
	body := unwrap(node.BodyData().Body)
	return isFunction(body)
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
	return node
}
func isContextuallyTypedFunction(ctx rule.RuleContext, node *ast.Node) bool {
	if !ast.IsArrowFunction(node) && !ast.IsFunctionExpression(node) {
		return false
	}
	typ := ctx.TypeChecker.GetContextualType(node, checker.ContextFlagsNone)
	return typ != nil && len(utils.GetCallSignatures(ctx.TypeChecker, typ)) > 0
}

func declarationName(node *ast.Node) *ast.Node {
	if name := ast.GetNameOfDeclaration(node); name != nil {
		return name
	}
	if node.Parent != nil && ast.IsVariableDeclaration(node.Parent) {
		return node.Parent.Name()
	}
	return nil
}

func hasOnlyContextualUse(ctx rule.RuleContext, declaration *ast.Node) bool {
	name := declarationName(declaration)
	if name == nil || !ast.IsIdentifier(name) {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(name)
	if symbol == nil {
		return false
	}
	contextual := false
	valid := true
	for _, file := range ctx.Program.SourceFiles() {
		if file.IsDeclarationFile {
			continue
		}
		walk(file.AsNode(), func(candidate *ast.Node) {
			if !valid || candidate == name || !ast.IsIdentifier(candidate) || ctx.TypeChecker.GetSymbolAtLocation(candidate) != symbol {
				return
			}
			current := outermostWrapper(candidate)
			parent := current.Parent
			if parent == nil || !ast.IsCallExpression(parent) {
				valid = false
				return
			}
			call := parent.AsCallExpression()
			if call.Expression == current {
				valid = false
				return
			}
			argument := false
			for _, item := range call.Arguments.Nodes {
				if item == current {
					argument = true
					break
				}
			}
			if !argument {
				valid = false
				return
			}
			signature := ctx.TypeChecker.GetResolvedSignature(parent)
			if signature == nil {
				valid = false
				return
			}
			signatureDeclaration := checker.Signature_declaration(signature)
			if signatureDeclaration == nil {
				valid = false
				return
			}
			source := ast.GetSourceFileOfNode(signatureDeclaration)
			if source == nil || (!source.IsDeclarationFile && !ctx.Program.IsSourceFileDefaultLibrary(source.Path())) {
				valid = false
				return
			}
			contextual = true
		})
	}
	return valid && contextual
}

func outermostWrapper(node *ast.Node) *ast.Node {
	for node.Parent != nil {
		parent := node.Parent
		switch parent.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = parent
		default:
			return node
		}
	}
	return node
}

func walk(node *ast.Node, visit func(*ast.Node)) {
	visit(node)
	for child := range node.IterChildren() {
		walk(child, visit)
	}
}

var PreferCurriedDataLastFunctionsRule = Rule
