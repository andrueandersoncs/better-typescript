package no_unsupported_d1_transactions

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "no-unsupported-d1-transactions",
	Description: "D1Client.withTransaction always defects because D1 transactions are unsupported.",
	Help:        "Use D1Client.batch for a fixed collection of D1 statements; it cannot replace an arbitrary Effect transaction body.",
}

var Rule = rule.Rule{Name: "no-unsupported-d1-transactions", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindCallExpression: func(node *ast.Node) {
			call := node.AsCallExpression()
			if transactionAccess(ctx, call.Expression) != nil {
				ctx.ReportNode(node, message)
			}
		},
		ast.KindPropertyAccessExpression: func(node *ast.Node) {
			if transactionAccess(ctx, node) != nil && isPipeStage(ctx, node) {
				ctx.ReportNode(node, message)
			}
		},
	}
}}

func transactionAccess(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	node = unwrap(node)
	if !ast.IsPropertyAccessExpression(node) {
		return nil
	}
	access := node.AsPropertyAccessExpression()
	if access.Name().Text() != "withTransaction" || !isD1Client(ctx, access.Expression) {
		return nil
	}
	return node
}

func isD1Client(ctx rule.RuleContext, receiver *ast.Node) bool {
	valueType := ctx.TypeChecker.GetTypeAtLocation(unwrap(receiver))
	if valueType == nil {
		return false
	}
	for _, property := range checker.Checker_getPropertiesOfType(ctx.TypeChecker, valueType) {
		if property.Name != "~@effect/sql-d1/D1Client" || !declaredByD1Client(property) {
			continue
		}
		return true
	}
	return false
}

func declaredByD1Client(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (filepath.Base(path) == "D1Client.ts" || filepath.Base(path) == "D1Client.d.ts") &&
			(strings.Contains(path, "/packages/sql/d1/src/") || strings.Contains(path, "/node_modules/@effect/sql-d1/")) {
			return true
		}
	}
	return false
}

func isPipeStage(ctx rule.RuleContext, node *ast.Node) bool {
	if node.Parent == nil || !ast.IsCallExpression(node.Parent) {
		return false
	}
	call := node.Parent.AsCallExpression()
	if ast.IsPropertyAccessExpression(call.Expression) {
		if !isEffectPipeableMethod(ctx, call.Expression) {
			return false
		}
		for _, argument := range call.Arguments.Nodes {
			if argument == node {
				return true
			}
		}
		return false
	}
	if !ast.IsIdentifier(call.Expression) || call.Expression.Text() != "pipe" {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, call.Expression)
	if symbol == nil || symbol.Name != "pipe" || !declaredByEffectFunction(symbol) {
		return false
	}
	for index, argument := range call.Arguments.Nodes {
		if index > 0 && argument == node {
			return true
		}
	}
	return false
}

func isEffectPipeableMethod(ctx rule.RuleContext, node *ast.Node) bool {
	access := node.AsPropertyAccessExpression()
	if access.Name().Text() != "pipe" {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, access.Name())
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (filepath.Base(path) == "Pipeable.ts" || filepath.Base(path) == "Pipeable.d.ts") &&
			(strings.Contains(path, "/packages/effect/src/") || strings.Contains(path, "/node_modules/effect/")) {
			return true
		}
	}
	return false
}

func declaredByEffectFunction(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (filepath.Base(path) == "Function.ts" || filepath.Base(path) == "Function.d.ts") &&
			(strings.Contains(path, "/packages/effect/src/") || strings.Contains(path, "/node_modules/effect/")) {
			return true
		}
	}
	return false
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
