package retry_without_jitter

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "retry-without-jitter",
	Description: "Jitter exponential or Fibonacci retry delays.",
	Help:        "Wrap each exponential or Fibonacci retry branch with Schedule.jittered when deterministic timing is not deliberate.",
}

type delayPolicy struct {
	unjitteredBackoff bool
}

var Rule = rule.Rule{Name: "retry-without-jitter", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		policy := retryPolicy(ctx, node)
		if policy == nil || !retryDelayPolicy(ctx, policy).unjitteredBackoff {
			return
		}
		ctx.ReportNode(node, message)
	}}
}}

func retryPolicy(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	call := node.AsCallExpression()
	name := effectRetryName(ctx, call.Expression)
	args := call.Arguments.Nodes
	switch name {
	case "retry":
		if len(args) >= 2 {
			return args[1]
		}
		if len(args) == 1 && isAppliedRetry(node) {
			return args[0]
		}
	case "retryOrElse":
		if len(args) >= 3 {
			return args[1]
		}
		if len(args) == 2 && isAppliedRetry(node) {
			return args[0]
		}
	}
	return nil
}

func retryDelayPolicy(ctx rule.RuleContext, node *ast.Node) delayPolicy {
	node = unwrap(node)
	if !ast.IsObjectLiteralExpression(node) {
		return delayPolicyFor(ctx, node)
	}
	var schedule *ast.Node
	for _, property := range node.AsObjectLiteralExpression().Properties.Nodes {
		if ast.IsSpreadAssignment(property) {
			return delayPolicy{}
		}
		if !ast.IsPropertyAssignment(property) {
			continue
		}
		name, ok := ast.TryGetTextOfPropertyName(property.Name())
		if ok && name == "schedule" {
			schedule = property.AsPropertyAssignment().Initializer
		}
	}
	if schedule == nil {
		return delayPolicy{}
	}
	return delayPolicyFor(ctx, schedule)
}
func delayPolicyFor(ctx rule.RuleContext, node *ast.Node) delayPolicy {
	node = unwrap(node)
	if node == nil {
		return delayPolicy{}
	}
	if !ast.IsCallExpression(node) {
		return delayPolicy{}
	}
	call := node.AsCallExpression()
	switch effectScheduleCall(ctx, call.Expression) {
	case "exponential", "fibonacci":
		return delayPolicy{unjitteredBackoff: true}
	case "jittered":
		return delayPolicy{}
	case "max", "min":
		if len(call.Arguments.Nodes) == 1 {
			return combinedDelayPolicy(ctx, call.Arguments.Nodes[0])
		}
	}
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name().Text() != "pipe" || len(call.Arguments.Nodes) != 1 {
		return delayPolicy{}
	}
	base := delayPolicyFor(ctx, callee.AsPropertyAccessExpression().Expression)
	return applyStage(ctx, base, call.Arguments.Nodes[0])
}

func combinedDelayPolicy(ctx rule.RuleContext, node *ast.Node) delayPolicy {
	node = unwrap(node)
	if !ast.IsArrayLiteralExpression(node) {
		return delayPolicy{}
	}
	for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
		if element.Kind != ast.KindSpreadElement && delayPolicyFor(ctx, element).unjitteredBackoff {
			return delayPolicy{unjitteredBackoff: true}
		}
	}
	return delayPolicy{}
}

func applyStage(ctx rule.RuleContext, base delayPolicy, stage *ast.Node) delayPolicy {
	stage = unwrap(stage)
	if !ast.IsCallExpression(stage) {
		switch effectScheduleName(ctx, stage) {
		case "jittered":
			return delayPolicy{}
		case "passthrough":
			return base
		default:
			return delayPolicy{}
		}
	}
	if effectScheduleCall(ctx, stage.AsCallExpression().Expression) == "jittered" {
		return delayPolicy{}
	}
	return base
}

func effectRetryName(ctx rule.RuleContext, expression *ast.Node) string {
	target := unwrap(expression)
	if ast.IsPropertyAccessExpression(target) {
		target = target.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(target) {
		return ""
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, target)
	if symbol == nil || (symbol.Name != "retry" && symbol.Name != "retryOrElse") || !declaredInEffectFile(symbol, "Effect") {
		return ""
	}
	return symbol.Name
}

func effectScheduleCall(ctx rule.RuleContext, expression *ast.Node) string {
	return effectScheduleName(ctx, expression)
}

func effectScheduleName(ctx rule.RuleContext, node *ast.Node) string {
	target := unwrap(node)
	if ast.IsPropertyAccessExpression(target) {
		target = target.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(target) {
		return ""
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, target)
	if symbol == nil || !declaredInEffectFile(symbol, "Schedule") {
		return ""
	}
	return symbol.Name
}

func declaredInEffectFile(symbol *ast.Symbol, module string) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == module+".ts" || base == module+".d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func isAppliedRetry(node *ast.Node) bool {
	if node.Parent == nil || !ast.IsCallExpression(node.Parent) {
		return false
	}
	parent := node.Parent.AsCallExpression()
	if parent.Expression == node {
		return true
	}
	if ast.IsPropertyAccessExpression(parent.Expression) && parent.Expression.AsPropertyAccessExpression().Name().Text() != "pipe" {
		return false
	}
	if ast.IsIdentifier(parent.Expression) && parent.Expression.Text() != "pipe" {
		return false
	}
	for _, argument := range parent.Arguments.Nodes {
		if argument == node {
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
