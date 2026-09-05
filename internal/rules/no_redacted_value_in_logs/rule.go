package no_redacted_value_in_logs

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "no-redacted-value-in-logs",
	Description: "Do not reveal a Redacted value in logs.",
	Help:        "Log the Redacted value or safe metadata instead of Redacted.value.",
}

var Rule = rule.Rule{
	Name: "no-redacted-value-in-logs",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			call := node.AsCallExpression()
			if !isRedactedValueCall(ctx, call) || !reachesLogSink(ctx, node) {
				return
			}
			ctx.ReportNode(call.Expression, message)
		}}
	},
}

func isRedactedValueCall(ctx rule.RuleContext, call *ast.CallExpression) bool {
	callee := unwrap(call.Expression)
	var target *ast.Node
	if ast.IsPropertyAccessExpression(callee) {
		target = callee.AsPropertyAccessExpression().Name()
	} else if ast.IsIdentifier(callee) {
		target = callee
	} else {
		return false
	}
	return isEffectRedactedSymbol(utils.ResolvedSymbol(ctx.TypeChecker, target))
}

func reachesLogSink(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node; current != nil; {
		parent := current.Parent
		if parent == nil {
			return false
		}
		switch parent.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression,
			ast.KindTemplateSpan, ast.KindTemplateExpression, ast.KindArrayLiteralExpression, ast.KindPropertyAssignment, ast.KindShorthandPropertyAssignment, ast.KindObjectLiteralExpression:
			current = parent
			continue
		case ast.KindBinaryExpression:
			binary := parent.AsBinaryExpression()
			if binary.OperatorToken.Kind != ast.KindPlusToken || (binary.Left != current && binary.Right != current) || !isStringConcatenation(ctx, binary) {
				return false
			}
			current = parent
			continue
		case ast.KindCallExpression:
			call := parent.AsCallExpression()
			if !isCallArgument(call, current) {
				return false
			}
			if isKnownLogSink(ctx, call) {
				return true
			}
			if isValuePreservingCall(ctx, call, current) {
				current = parent
				continue
			}
		}
		return false
	}
	return false
}

func isStringConcatenation(ctx rule.RuleContext, expression *ast.BinaryExpression) bool {
	value := ctx.TypeChecker.GetTypeAtLocation(expression.AsNode())
	return value != nil && checker.Type_flags(value)&checker.TypeFlagsStringLike != 0
}

func isCallArgument(call *ast.CallExpression, node *ast.Node) bool {
	for _, argument := range call.Arguments.Nodes {
		if argument == node {
			return true
		}
	}
	return false
}

func isKnownLogSink(ctx rule.RuleContext, call *ast.CallExpression) bool {
	callee := unwrap(call.Expression)
	if ast.IsPropertyAccessExpression(callee) {
		name := callee.AsPropertyAccessExpression().Name()
		if name == nil {
			return false
		}
		symbol := utils.ResolvedSymbol(ctx.TypeChecker, name)
		return isEffectLogSymbol(symbol) ||
			isEffectConsoleSymbol(symbol) ||
			isKnownConsoleMethod(name.Text()) && isBuiltinConsoleReceiver(ctx, callee.AsPropertyAccessExpression().Expression)
	}
	if !ast.IsIdentifier(callee) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	return isEffectLogSymbol(symbol) || isEffectConsoleSymbol(symbol)
}

func isEffectLogSymbol(symbol *ast.Symbol) bool {
	if symbol == nil || !isEffectLogName(symbol.Name) {
		return false
	}
	return declaredInEffectModule(symbol, "Effect.ts", "Effect.d.ts")
}

func isEffectConsoleSymbol(symbol *ast.Symbol) bool {
	if symbol == nil || !isKnownConsoleMethod(symbol.Name) {
		return false
	}
	return declaredInEffectModule(symbol, "Console.ts", "Console.d.ts")
}

func isEffectLogName(name string) bool {
	switch name {
	case "log", "logTrace", "logDebug", "logInfo", "logWarning", "logError", "logFatal":
		return true
	}
	return false
}

func isKnownConsoleMethod(name string) bool {
	switch name {
	case "log", "trace", "debug", "info", "warn", "error":
		return true
	}
	return false
}

func isBuiltinConsoleReceiver(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	return ast.IsIdentifier(node) && node.Text() == "console" && isBuiltinSymbol(utils.ResolvedSymbol(ctx.TypeChecker, node))
}

func isValuePreservingCall(ctx rule.RuleContext, call *ast.CallExpression, value *ast.Node) bool {
	if len(call.Arguments.Nodes) == 0 || call.Arguments.Nodes[0] != value {
		return false
	}
	callee := unwrap(call.Expression)
	if ast.IsIdentifier(callee) {
		return callee.Text() == "String" && isBuiltinSymbol(utils.ResolvedSymbol(ctx.TypeChecker, callee))
	}
	if len(call.Arguments.Nodes) != 1 || !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name() == nil || callee.AsPropertyAccessExpression().Name().Text() != "stringify" {
		return false
	}
	receiver := unwrap(callee.AsPropertyAccessExpression().Expression)
	return ast.IsIdentifier(receiver) && receiver.Text() == "JSON" && isBuiltinSymbol(utils.ResolvedSymbol(ctx.TypeChecker, receiver))
}

func isEffectRedactedSymbol(symbol *ast.Symbol) bool {
	if symbol == nil || symbol.Name != "value" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && effectFile(file.FileName()) && (filepath.Base(file.FileName()) == "Redacted.ts" || filepath.Base(file.FileName()) == "Redacted.d.ts") {
			return true
		}
	}
	return false
}

func declaredInEffectModule(symbol *ast.Symbol, names ...string) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil || !effectFile(file.FileName()) {
			continue
		}
		for _, name := range names {
			if filepath.Base(file.FileName()) == name {
				return true
			}
		}
	}
	return false
}

func effectFile(fileName string) bool {
	path := strings.ReplaceAll(fileName, "\\", "/")
	return strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")
}

func isBuiltinSymbol(symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasPrefix(filepath.Base(file.FileName()), "lib.") && strings.HasSuffix(file.FileName(), ".d.ts") {
			return true
		}
	}
	return false
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
	return nil
}
