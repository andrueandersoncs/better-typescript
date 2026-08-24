package prefer_function_composition

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"strings"
)

var blockMessage = rule.RuleMessage{Id: "prefer-function-composition", Description: "Avoid block bodies that only bind a value and thread it into a call.", Help: "Use pipe, flow, or Function.compose (or a related Function combinator) so the steps compose as an expression instead of a manually threaded local. Do not nest the calls."}
var effectMessage = rule.RuleMessage{Id: "prefer-function-composition", Description: "Avoid straight-line Effect transformations threaded through single-use bindings.", Help: "Use one data-last pipe from the source Effect through each transformation and Effect.runPromise."}

func unwrap(n *ast.Node) *ast.Node {
	for n != nil {
		switch n.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindNonNullExpression:
			n = n.Expression()
		default:
			return n
		}
	}
	return n
}
func count(source *ast.SourceFile, n *ast.Node, name string) int {
	c := 0
	if ast.IsIdentifier(n) && n.Text() == name {
		c++
	}
	ast.ForEachChildAndJSDoc(n, source, func(ch *ast.Node) bool { c += count(source, ch, name); return false })
	return c
}
func carrierTower(n *ast.Node, name string) bool {
	n = unwrap(n)
	if ast.IsIdentifier(n) {
		return n.Text() == name
	}
	if !ast.IsCallExpression(n) {
		return false
	}
	c := n.AsCallExpression()
	if len(c.Arguments.Nodes) == 0 {
		return false
	}
	if ast.IsIdentifier(c.Expression) && c.Expression.Text() == "pipe" {
		return carrierTower(c.Arguments.Nodes[0], name)
	}
	if len(c.Arguments.Nodes) != 1 {
		return false
	}
	return carrierTower(c.Arguments.Nodes[0], name)
}

func effectPipeline(ctx rule.RuleContext, body *ast.Node) bool {
	if !ast.IsBlock(body) {
		return false
	}
	statements := body.AsBlock().Statements.Nodes
	if len(statements) < 3 || !ast.IsReturnStatement(statements[len(statements)-1]) {
		return false
	}
	declarations := make([]*ast.VariableDeclaration, 0, len(statements)-1)
	for _, statement := range statements[:len(statements)-1] {
		if !ast.IsVariableStatement(statement) {
			return false
		}
		list := statement.AsVariableStatement().DeclarationList
		decls := list.AsVariableDeclarationList().Declarations.Nodes
		if list.Flags&ast.NodeFlagsConst == 0 || len(decls) != 1 {
			return false
		}
		declaration := decls[0].AsVariableDeclaration()
		if !ast.IsIdentifier(declaration.Name()) || declaration.Initializer == nil {
			return false
		}
		declarations = append(declarations, declaration)
	}
	firstType := ctx.TypeChecker.TypeToString(ctx.TypeChecker.GetTypeAtLocation(declarations[0].Initializer))
	if !strings.Contains(firstType, "Effect<") {
		return false
	}
	for i := 1; i < len(declarations); i++ {
		previous := declarations[i-1].Name().Text()
		if count(ctx.SourceFile, declarations[i].Initializer, previous) != 1 {
			return false
		}
	}
	for _, declaration := range declarations {
		if count(ctx.SourceFile, body, declaration.Name().Text()) != 2 {
			return false
		}
	}
	returned := statements[len(statements)-1].AsReturnStatement().Expression
	returned = unwrap(returned)
	if !ast.IsCallExpression(returned) {
		return false
	}
	call := returned.AsCallExpression()
	if len(call.Arguments.Nodes) != 1 || !ast.IsPropertyAccessExpression(call.Expression) {
		return false
	}
	access := call.Expression.AsPropertyAccessExpression()
	if access.Name().Text() != "runPromise" || !ast.IsIdentifier(access.Expression) || access.Expression.Text() != "Effect" {
		return false
	}
	last := unwrap(call.Arguments.Nodes[0])
	return ast.IsIdentifier(last) && last.Text() == declarations[len(declarations)-1].Name().Text()
}

var PreferFunctionCompositionRule = rule.Rule{
	Name: "prefer-function-composition",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindArrowFunction: func(node *ast.Node) {
			fn := node.AsArrowFunction()
			if ast.IsBlock(fn.Body) {
				if effectPipeline(ctx, fn.Body) {
					ctx.ReportNode(fn.Body, effectMessage)
					return
				}
				b := fn.Body.AsBlock()
				if len(b.Statements.Nodes) == 2 && ast.IsVariableStatement(b.Statements.Nodes[0]) && ast.IsReturnStatement(b.Statements.Nodes[1]) {
					list := b.Statements.Nodes[0].AsVariableStatement().DeclarationList
					if list.Flags&ast.NodeFlagsConst != 0 && len(list.AsVariableDeclarationList().Declarations.Nodes) == 1 {
						d := list.AsVariableDeclarationList().Declarations.Nodes[0].AsVariableDeclaration()
						ret := b.Statements.Nodes[1].AsReturnStatement().Expression
						if ast.IsIdentifier(d.Name()) && d.Initializer != nil && !ast.IsArrowFunction(d.Initializer) && !ast.IsFunctionExpression(d.Initializer) && ret != nil && !(ast.IsIdentifier(unwrap(ret)) && unwrap(ret).Text() == d.Name().Text()) && count(ctx.SourceFile, ret, d.Name().Text()) == 1 && carrierTower(ret, d.Name().Text()) {
							ctx.ReportNode(fn.Body, blockMessage)
							return
						}
					}
				}
			}
			if len(fn.Parameters.Nodes) != 1 || fn.Parameters.Nodes[0].AsParameterDeclaration().Type == nil {
				return
			}
			p := fn.Parameters.Nodes[0].AsParameterDeclaration()
			if !ast.IsIdentifier(p.Name()) {
				return
			}
			callNode := unwrap(fn.Body)
			if !ast.IsCallExpression(callNode) {
				return
			}
			call := callNode.AsCallExpression()
			if len(call.Arguments.Nodes) != 1 {
				return
			}
			arg := unwrap(call.Arguments.Nodes[0])
			if !ast.IsPropertyAccessExpression(arg) || ast.IsOptionalChain(arg) {
				return
			}
			a := arg.AsPropertyAccessExpression()
			if !ast.IsIdentifier(a.Expression) || a.Expression.Text() != p.Name().Text() {
				return
			}
			partial := unwrap(call.Expression)
			if !ast.IsCallExpression(partial) {
				return
			}
			pc := partial.AsCallExpression()
			if len(pc.Arguments.Nodes) != 1 || !ast.IsIdentifier(pc.Expression) {
				return
			}
			typeRange := utils.TrimNodeTextRange(ctx.SourceFile, p.Type)
			partialRange := utils.TrimNodeTextRange(ctx.SourceFile, partial)
			typeText := ctx.SourceFile.Text()[typeRange.Pos():typeRange.End()]
			partialText := ctx.SourceFile.Text()[partialRange.Pos():partialRange.End()]
			msg := rule.RuleMessage{Id: "prefer-function-composition", Description: "Avoid unary adapters that project a property into a partial function.", Help: fmt.Sprintf("Use flow(Struct.get<%s>(%q), %s) instead.", typeText, a.Name().Text(), partialText)}
			ctx.ReportNode(node, msg)
		}}
	},
}

var Rule = PreferFunctionCompositionRule
