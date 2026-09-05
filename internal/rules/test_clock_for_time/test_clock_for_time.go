package test_clock_for_time

import (
	"math"
	"regexp"
	"strconv"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "testClockForTime",
	Description: "Do not sleep before advancing TestClock in the same fiber.",
	Help:        "Fork the positive sleep, then advance TestClock and join or interrupt the fiber.",
}

var durationLiteral = regexp.MustCompile(`^(\d+(?:\.\d+)?)\s+(?:nanos?|micros?|millis?|seconds?|minutes?|hours?|days?|weeks?)$`)

var TestClockForTimeRule = rule.Rule{Name: "test-clock-for-time", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		rule.ListenerOnExit(ast.KindFunctionExpression): func(node *ast.Node) {
			checkGenerator(ctx, node)
		},
	}
}}

func checkGenerator(ctx rule.RuleContext, generator *ast.Node) {
	if generator.BodyData().AsteriskToken == nil || !directVirtualTestGenerator(ctx, generator) {
		return
	}
	body := generator.BodyData().Body
	if body == nil || !ast.IsBlock(body) {
		return
	}
	statements := body.AsBlock().Statements.Nodes
	var pendingSleep *ast.CallExpression
	for _, statement := range statements {
		if call := directYieldCall(statement); call != nil {
			if pendingSleep != nil && isTestClockAdvance(ctx, call) {
				ctx.ReportNode(pendingSleep.Expression, message)
				return
			}
			if pendingSleep == nil && isPositiveEffectSleep(ctx, call) {
				pendingSleep = call
			}
			continue
		}
		if !isInertStatement(statement) {
			return
		}
	}
}

func directVirtualTestGenerator(ctx rule.RuleContext, generator *ast.Node) bool {
	gen := generator.Parent
	if gen == nil || !ast.IsCallExpression(gen) || !isEffectMember(ctx, gen.AsCallExpression().Expression, "gen") {
		return false
	}
	parent := gen.Parent
	if parent == nil {
		return false
	}
	if ast.IsArrowFunction(parent) || ast.IsFunctionExpression(parent) {
		return parent.BodyData().Body == gen && isVirtualTestCallback(ctx, parent)
	}
	if !ast.IsReturnStatement(parent) || parent.AsReturnStatement().Expression != gen || parent.Parent == nil || !ast.IsBlock(parent.Parent) {
		return false
	}
	callback := parent.Parent.Parent
	return callback != nil && (ast.IsArrowFunction(callback) || ast.IsFunctionExpression(callback)) &&
		callback.BodyData().Body == parent.Parent && isVirtualTestCallback(ctx, callback)
}

func isVirtualTestCallback(ctx rule.RuleContext, callback *ast.Node) bool {
	call := callback.Parent
	if call == nil || !ast.IsCallExpression(call) {
		return false
	}
	for _, argument := range call.AsCallExpression().Arguments.Nodes {
		if unwrap(argument) == callback {
			return isVirtualEffectTestCall(ctx, call)
		}
	}
	return false
}

func isVirtualEffectTestCall(ctx rule.RuleContext, node *ast.Node) bool {
	members, root := effectTestMembers(node.AsCallExpression().Expression)
	if root == nil || !isEffectVitestIt(ctx, root) || !contains(members, "effect") {
		return false
	}
	return !contains(members, "live")
}

func effectTestMembers(node *ast.Node) ([]string, *ast.Node) {
	node = unwrap(node)
	if node == nil {
		return nil, nil
	}
	if ast.IsIdentifier(node) {
		return nil, node
	}
	if ast.IsPropertyAccessExpression(node) {
		access := node.AsPropertyAccessExpression()
		members, root := effectTestMembers(access.Expression)
		if access.Name() == nil {
			return nil, nil
		}
		return append(members, access.Name().Text()), root
	}
	if ast.IsCallExpression(node) {
		return effectTestMembers(node.AsCallExpression().Expression)
	}
	return nil, nil
}

func contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}

func directYieldCall(statement *ast.Node) *ast.CallExpression {
	if !ast.IsExpressionStatement(statement) {
		return nil
	}
	yield := unwrap(statement.AsExpressionStatement().Expression)
	if !ast.IsYieldExpression(yield) || yield.AsYieldExpression().AsteriskToken == nil {
		return nil
	}
	expression := unwrap(yield.AsYieldExpression().Expression)
	if !ast.IsCallExpression(expression) {
		return nil
	}
	return expression.AsCallExpression()
}

func isInertStatement(statement *ast.Node) bool {
	if !ast.IsVariableStatement(statement) {
		return false
	}
	for _, declaration := range statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
		initializer := declaration.AsVariableDeclaration().Initializer
		if initializer == nil {
			continue
		}
		initializer = unwrap(initializer)
		switch initializer.Kind {
		case ast.KindNumericLiteral, ast.KindStringLiteral, ast.KindTrueKeyword, ast.KindFalseKeyword, ast.KindNullKeyword:
		default:
			return false
		}
	}
	return true
}

func isPositiveEffectSleep(ctx rule.RuleContext, call *ast.CallExpression) bool {
	if !isEffectMember(ctx, call.Expression, "sleep") || len(call.Arguments.Nodes) != 1 {
		return false
	}
	duration := unwrap(call.Arguments.Nodes[0])
	if ast.IsNumericLiteral(duration) {
		value, err := strconv.ParseFloat(strings.ReplaceAll(duration.Text(), "_", ""), 64)
		return err == nil && value > 0 && !math.IsInf(value, 0) && !math.IsNaN(value)
	}
	if !ast.IsStringLiteralLike(duration) {
		return false
	}
	match := durationLiteral.FindStringSubmatch(duration.Text())
	if len(match) != 2 {
		return false
	}
	value, err := strconv.ParseFloat(match[1], 64)
	return err == nil && value > 0 && !math.IsInf(value, 0) && !math.IsNaN(value)
}

func isTestClockAdvance(ctx rule.RuleContext, call *ast.CallExpression) bool {
	callee := unwrap(call.Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || (symbol.Name != "adjust" && symbol.Name != "setTime") {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil {
			path := strings.ReplaceAll(file.FileName(), "\\", "/")
			if strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/") {
				return strings.HasSuffix(path, "/TestClock.ts") || strings.HasSuffix(path, "/TestClock.d.ts")
			}
		}
	}
	return false
}

func isEffectMember(ctx rule.RuleContext, expression *ast.Node, wanted string) bool {
	callee := unwrap(expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != wanted {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil {
			path := strings.ReplaceAll(file.FileName(), "\\", "/")
			if strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/") {
				return true
			}
		}
	}
	return false
}

func isEffectVitestIt(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	if symbol == nil || symbol.Name != "it" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil {
			path := strings.ReplaceAll(file.FileName(), "\\", "/")
			if strings.Contains(path, "/node_modules/@effect/vitest/") || strings.Contains(path, "/packages/vitest/src/") {
				return true
			}
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

var Rule = TestClockForTimeRule
