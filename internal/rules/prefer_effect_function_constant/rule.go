package prefer_effect_function_constant

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var Rule = rule.Rule{Name: "prefer-effect-function-constant", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	listener := func(node *ast.Node) {
		if len(node.Parameters()) != 0 || hasModifier(node, ast.KindAsyncKeyword) || (ast.IsFunctionExpression(node) && node.BodyData().AsteriskToken != nil) || (node.FunctionLikeData().TypeParameters != nil && len(node.FunctionLikeData().TypeParameters.Nodes) > 0) {
			return
		}
		expression := returnedExpression(node)
		if expression == nil {
			return
		}
		unwrapped := unwrap(expression)
		if !primitive(unwrapped) && !stableConstIdentifier(ctx, unwrapped, node) {
			return
		}
		text := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, expression, false)
		ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-function-constant", Description: "Avoid a handwritten constant thunk.", Help: fmt.Sprintf("Use Function.constant(%s) from Effect when a zero-argument function only returns a stable value. Function.constant captures that value once and returns a zero-argument function.", text)})
	}
	return rule.RuleListeners{ast.KindArrowFunction: listener, ast.KindFunctionExpression: listener}
}}

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
func returnedExpression(n *ast.Node) *ast.Node {
	body := n.BodyData().Body
	if body == nil {
		return nil
	}
	if ast.IsArrowFunction(n) && !ast.IsBlock(body) {
		return body
	}
	if !ast.IsBlock(body) || len(body.AsBlock().Statements.Nodes) != 1 {
		return nil
	}
	statement := body.AsBlock().Statements.Nodes[0]
	if !ast.IsReturnStatement(statement) {
		return nil
	}
	return statement.AsReturnStatement().Expression
}
func primitive(n *ast.Node) bool {
	if n == nil {
		return false
	}
	switch n.Kind {
	case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral, ast.KindNumericLiteral, ast.KindBigIntLiteral, ast.KindTrueKeyword, ast.KindFalseKeyword, ast.KindNullKeyword:
		return true
	}
	return false
}
func stableConstIdentifier(ctx rule.RuleContext, n, fn *ast.Node) bool {
	if !ast.IsIdentifier(n) {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(n)
	if symbol == nil || len(symbol.Declarations) != 1 {
		return false
	}
	d := symbol.Declarations[0]
	if !ast.IsVariableDeclaration(d) || d.Parent == nil || !ast.IsVariableDeclarationList(d.Parent) || d.Parent.Flags&ast.NodeFlagsConst == 0 || len(d.Parent.AsVariableDeclarationList().Declarations.Nodes) != 1 {
		return false
	}
	return ast.GetSourceFileOfNode(d) == ctx.SourceFile && d.End() <= fn.Pos() && ast.IsIdentifier(d.Name())
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

var PreferEffectFunctionConstantRule = Rule
