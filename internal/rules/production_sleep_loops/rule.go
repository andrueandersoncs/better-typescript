package production_sleep_loops

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var Rule = rule.Rule{Name: "production-sleep-loops", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		loop := enclosingInfiniteLoop(node)
		if !isEffectSleep(ctx, call) || !hasFixedDuration(call) || loop == nil || !isDirectlyExecutedSleep(ctx, node) || isDeadlineOrLatchProtocol(ctx, loop) {
			return
		}
		ctx.ReportNode(node, message())
	}}
}}

func isEffectSleep(ctx rule.RuleContext, call *ast.CallExpression) bool {
	callee := unwrap(call.Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(callee) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != "sleep" {
		return false
	}
	return declaredInEffectModule(symbol, "Effect.ts")
}

func hasFixedDuration(call *ast.CallExpression) bool {
	if len(call.Arguments.Nodes) != 1 {
		return false
	}
	duration := unwrap(call.Arguments.Nodes[0])
	return ast.IsNumericLiteral(duration) || ast.IsStringLiteralLike(duration)
}

func enclosingInfiniteLoop(node *ast.Node) *ast.Node {
	for parent := node.Parent; parent != nil; parent = parent.Parent {
		if ast.IsWhileStatement(parent) && isTrue(parent.AsWhileStatement().Expression) {
			return parent
		}
		if ast.IsForStatement(parent) && parent.AsForStatement().Condition == nil {
			return parent
		}
		if ast.IsFunctionLike(parent) {
			return nil
		}
	}
	return nil
}

func isDirectlyExecutedSleep(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsYieldExpression(current) {
			yield := current.AsYieldExpression()
			return yield.AsteriskToken != nil && unwrap(yield.Expression) == node && yieldIsInEffectGen(ctx, current)
		}
		if ast.IsArrowFunction(current) || ast.IsFunctionExpression(current) || ast.IsFunctionDeclaration(current) || ast.IsMethodDeclaration(current) {
			return false
		}
	}
	return false
}

func yieldIsInEffectGen(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsFunctionExpression(current) {
			continue
		}
		if current.BodyData().AsteriskToken == nil || current.Parent == nil || !ast.IsCallExpression(current.Parent) {
			return false
		}
		call := current.Parent.AsCallExpression()
		for _, argument := range call.Arguments.Nodes {
			if argument == current {
				return isEffectGen(ctx, call.Expression)
			}
		}
		return false
	}
	return false
}

func isEffectGen(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if ast.IsPropertyAccessExpression(node) {
		node = node.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(node) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	return symbol != nil && symbol.Name == "gen" && declaredInEffectModule(symbol, "Effect.ts")
}

func isDeadlineOrLatchProtocol(ctx rule.RuleContext, loop *ast.Node) bool {
	for _, statement := range loopStatements(loop) {
		if ast.IsIfStatement(statement) && containsDateNow(statement.AsIfStatement().Expression) {
			return true
		}
		if ast.IsExpressionStatement(statement) && isLatchCall(ctx, statement.AsExpressionStatement().Expression) {
			return true
		}
	}
	return false
}

func loopStatements(loop *ast.Node) []*ast.Node {
	var statement *ast.Node
	if ast.IsWhileStatement(loop) {
		statement = loop.AsWhileStatement().Statement
	} else if ast.IsForStatement(loop) {
		statement = loop.AsForStatement().Statement
	}
	if ast.IsBlock(statement) {
		return statement.AsBlock().Statements.Nodes
	}
	if statement != nil {
		return []*ast.Node{statement}
	}
	return nil
}

func containsDateNow(node *ast.Node) bool {
	node = unwrap(node)
	if ast.IsCallExpression(node) {
		callee := unwrap(node.AsCallExpression().Expression)
		return ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil && callee.AsPropertyAccessExpression().Name().Text() == "now" && ast.IsIdentifier(unwrap(callee.AsPropertyAccessExpression().Expression)) && unwrap(callee.AsPropertyAccessExpression().Expression).Text() == "Date"
	}
	if ast.IsBinaryExpression(node) {
		return containsDateNow(node.AsBinaryExpression().Left) || containsDateNow(node.AsBinaryExpression().Right)
	}
	return false
}

func isLatchCall(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if ast.IsYieldExpression(node) {
		node = unwrap(node.AsYieldExpression().Expression)
	}
	if !ast.IsCallExpression(node) {
		return false
	}
	callee := unwrap(node.AsCallExpression().Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(callee) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	return symbol != nil && (symbol.Name == "await" || symbol.Name == "close" || symbol.Name == "open") && declaredInEffectModule(symbol, "Latch.ts")
}

func isTrue(node *ast.Node) bool {
	node = unwrap(node)
	return node != nil && node.Kind == ast.KindTrueKeyword
}

func declaredInEffectModule(symbol *ast.Symbol, module string) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) &&
			(strings.HasSuffix(path, "/"+module) || strings.HasSuffix(path, "/"+strings.TrimSuffix(module, ".ts")+".d.ts")) {
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

func message() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "production-sleep-loops",
		Description: "Prefer Effect.repeat with Schedule.spaced for fixed-pacing polling.",
		Help:        "Use Effect.repeat with Schedule.spaced when each iteration has a fixed pacing delay. Keep deadline, latch, and event-driven loops explicit because their timing is not schedule-equivalent.",
	}
}
