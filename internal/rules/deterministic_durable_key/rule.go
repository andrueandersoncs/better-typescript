package deterministic_durable_key

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "deterministic-durable-key",
	Description: "Do not derive a durable key from randomness or the current time.",
	Help:        "Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.",
}

var Rule = rule.Rule{Name: "deterministic-durable-key", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindCallExpression: func(node *ast.Node) {
			if nondeterministicCall(ctx, node) && isImmediateKeyReturn(ctx, node) {
				ctx.ReportNode(node, message)
			}
		},
		ast.KindNewExpression: func(node *ast.Node) {
			if nondeterministicDate(ctx, node) && isImmediateKeyReturn(ctx, node) {
				ctx.ReportNode(node, message)
			}
		},
		ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if declaration.Initializer == nil || !ast.IsIdentifier(declaration.Name()) || !nondeterministicExpression(ctx, declaration.Initializer) {
				return
			}
			callback := enclosingFunction(node)
			if callback == nil || !isKeyCallback(ctx, callback) {
				return
			}
			symbol := ctx.TypeChecker.GetSymbolAtLocation(declaration.Name())
			if symbol != nil && directlyReturnsSymbol(ctx, callback, symbol) {
				ctx.ReportNode(declaration.Initializer, message)
			}
		},
	}
}}

func nondeterministicExpression(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if ast.IsNewExpression(node) {
		return nondeterministicDate(ctx, node)
	}
	if !ast.IsCallExpression(node) {
		return false
	}
	if nondeterministicCall(ctx, node) {
		return true
	}
	callee := unwrap(node.AsCallExpression().Expression)
	return ast.IsPropertyAccessExpression(callee) && ast.IsCallExpression(unwrap(callee.AsPropertyAccessExpression().Expression)) &&
		nondeterministicCall(ctx, unwrap(callee.AsPropertyAccessExpression().Expression))
}

func nondeterministicCall(ctx rule.RuleContext, node *ast.Node) bool {
	callee := unwrap(node.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}
	access := callee.AsPropertyAccessExpression()
	name := access.Name().Text()
	receiver := unwrap(access.Expression)
	return (name == "random" && isBuiltinGlobal(ctx, receiver, "Math")) ||
		((name == "randomUUID" || name == "getRandomValues") && isBuiltinGlobal(ctx, receiver, "crypto")) ||
		(name == "now" && isBuiltinGlobal(ctx, receiver, "Date"))
}

func nondeterministicDate(ctx rule.RuleContext, node *ast.Node) bool {
	constructor := unwrap(node.AsNewExpression().Expression)
	return ast.IsIdentifier(constructor) && isBuiltinGlobal(ctx, constructor, "Date") &&
		(node.AsNewExpression().Arguments == nil || len(node.AsNewExpression().Arguments.Nodes) == 0)
}

func isBuiltinGlobal(ctx rule.RuleContext, node *ast.Node, name string) bool {
	if !ast.IsIdentifier(node) || node.Text() != name {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasPrefix(filepath.Base(file.FileName()), "lib.") {
			return true
		}
	}
	return false
}

func isImmediateKeyReturn(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsFunctionLike(current) {
			continue
		}
		return isKeyCallback(ctx, current) && returnsExpression(current, node)
	}
	return false
}

func isKeyCallback(ctx rule.RuleContext, node *ast.Node) bool {
	return isKeyCallbackOwner(node) && keyDefinitionOwner(ctx, node) != ""
}

func isKeyCallbackOwner(node *ast.Node) bool {
	if node.Parent == nil || !ast.IsPropertyAssignment(node.Parent) {
		return false
	}
	property := node.Parent.AsPropertyAssignment()
	if property.Initializer != node {
		return false
	}
	name, ok := ast.TryGetTextOfPropertyName(property.Name())
	return ok && (name == "idempotencyKey" || name == "primaryKey")
}

func keyDefinitionOwner(ctx rule.RuleContext, callback *ast.Node) string {
	property := callback.Parent
	if property == nil || property.Parent == nil || !ast.IsObjectLiteralExpression(property.Parent) || property.Parent.Parent == nil || !ast.IsCallExpression(property.Parent.Parent) {
		return ""
	}
	call := property.Parent.Parent.AsCallExpression()
	owner := supportedMakeOwner(ctx, call.Expression)
	if owner == "" {
		return ""
	}
	name, _ := ast.TryGetTextOfPropertyName(property.AsPropertyAssignment().Name())
	if (owner == "Workflow" || owner == "DurableQueue") && name == "idempotencyKey" && len(call.Arguments.Nodes) == 1+boolToInt(owner == "Workflow") {
		return owner
	}
	if owner == "Rpc" && name == "primaryKey" && len(call.Arguments.Nodes) == 2 {
		return owner
	}
	return ""
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func supportedMakeOwner(ctx rule.RuleContext, expression *ast.Node) string {
	target := unwrap(expression)
	if ast.IsPropertyAccessExpression(target) {
		target = target.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(target) {
		return ""
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, target)
	if symbol == nil || symbol.Name != "make" {
		return ""
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if !strings.Contains(path, "/packages/effect/src/") && !strings.Contains(path, "/node_modules/effect/") {
			continue
		}
		switch filepath.Base(path) {
		case "Workflow.ts", "Workflow.d.ts":
			return "Workflow"
		case "DurableQueue.ts", "DurableQueue.d.ts":
			return "DurableQueue"
		case "Rpc.ts", "Rpc.d.ts":
			return "Rpc"
		}
	}
	return ""
}

func returnsExpression(callback, expression *ast.Node) bool {
	body := callback.Body()
	if body == nil {
		return false
	}
	for current := expression; current != nil && current != callback; current = current.Parent {
		parent := current.Parent
		if parent != nil && ast.IsBinaryExpression(parent) {
			binary := parent.AsBinaryExpression()
			if binary.OperatorToken.Kind == ast.KindCommaToken && binary.Left == current {
				return false
			}
		}
		if ast.IsReturnStatement(current) {
			return true
		}
		if current == body {
			return !ast.IsBlock(body)
		}
	}
	return false
}

func directlyReturnsSymbol(ctx rule.RuleContext, callback *ast.Node, symbol *ast.Symbol) bool {
	body := callback.Body()
	if body == nil || !ast.IsBlock(body) {
		return false
	}
	for _, statement := range body.AsBlock().Statements.Nodes {
		if !ast.IsReturnStatement(statement) || statement.AsReturnStatement().Expression == nil {
			continue
		}
		if returnExpressionReferencesSymbol(ctx, statement.AsReturnStatement().Expression, symbol) {
			return true
		}
	}
	return false
}

func returnExpressionReferencesSymbol(ctx rule.RuleContext, node *ast.Node, symbol *ast.Symbol) bool {
	node = unwrap(node)
	if ast.IsIdentifier(node) {
		return ctx.TypeChecker.GetSymbolAtLocation(node) == symbol
	}
	if ast.IsBinaryExpression(node) && node.AsBinaryExpression().OperatorToken.Kind == ast.KindPlusToken {
		binary := node.AsBinaryExpression()
		return returnExpressionReferencesSymbol(ctx, binary.Left, symbol) ||
			returnExpressionReferencesSymbol(ctx, binary.Right, symbol)
	}
	if !ast.IsTemplateExpression(node) {
		return false
	}
	for _, span := range node.AsTemplateExpression().TemplateSpans.Nodes {
		if returnExpressionReferencesSymbol(ctx, span.AsTemplateSpan().Expression, symbol) {
			return true
		}
	}
	return false
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
