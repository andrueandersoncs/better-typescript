package bounded_retry_schedule

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "bounded-retry-schedule",
	Description: "Use a bounded retry schedule unless a local waiver documents forever retry.",
	Help:        "Use recurs or upTo to make retries operationally bounded.",
}

var waiverPattern = regexp.MustCompile(`(?i)(unbounded|forever-ok|allow-forever|effect-quality-allow-unbounded-retry)`)
var boundPattern = regexp.MustCompile(`\b(recurs|upTo|times|count|while|until|intersect)\b`)

var Rule = rule.Rule{Name: "bounded-retry-schedule", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		name, receiver, ok := callName(node)
		if !ok || name != "retry" {
			return
		}
		if receiver != nil && !(ast.IsIdentifier(unwrap(receiver)) && unwrap(receiver).Text() == "Effect") {
			return
		}
		start := node.Pos() - 300
		if start < 0 {
			start = 0
		}
		if waiverPattern.MatchString(ctx.SourceFile.Text()[start:node.Pos()]) {
			return
		}
		policy := retryPolicy(node.AsCallExpression())
		if policy == nil || policyIsBounded(ctx, policy) {
			return
		}
		ctx.ReportNode(node, message)
	}}
}}

func retryPolicy(call *ast.CallExpression) *ast.Node {
	args := call.Arguments.Nodes
	if len(args) == 0 {
		return nil
	}
	first := unwrap(args[0])
	if ast.IsObjectLiteralExpression(first) {
		return first
	}
	if len(args) > 1 {
		return unwrap(args[1])
	}
	if ast.IsArrowFunction(first) || ast.IsFunctionExpression(first) {
		return nil
	}
	return first
}

func policyIsBounded(ctx rule.RuleContext, policy *ast.Node) bool {
	policy = unwrap(policy)
	if !ast.IsObjectLiteralExpression(policy) {
		return boundPattern.MatchString(nodeText(ctx.SourceFile, policy))
	}
	object := policy.AsObjectLiteralExpression()
	hasTimes, hasWhileUntil, hasSchedule, scheduleBound := false, false, false, false
	for _, prop := range object.Properties.Nodes {
		if !ast.IsPropertyAssignment(prop) {
			continue
		}
		name, ok := ast.TryGetTextOfPropertyName(prop.Name())
		if !ok {
			continue
		}
		value := unwrap(prop.AsPropertyAssignment().Initializer)
		switch name {
		case "times":
			hasTimes = ast.IsNumericLiteral(value) || ast.IsIdentifier(value)
		case "while", "until":
			hasWhileUntil = true
		case "schedule":
			hasSchedule = true
			scheduleBound = boundPattern.MatchString(nodeText(ctx.SourceFile, value))
		}
	}
	if hasSchedule && !scheduleBound && !hasTimes && !hasWhileUntil {
		return false
	}
	return hasTimes || hasWhileUntil || !hasSchedule || scheduleBound
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression:
			node = node.Expression()
		case ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func propertyName(node *ast.Node) (string, *ast.Node, bool) {
	node = unwrap(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return "", nil, false
	}
	return node.Name().Text(), node.AsPropertyAccessExpression().Expression, true
}

func callName(node *ast.Node) (string, *ast.Node, bool) {
	if node == nil || !ast.IsCallExpression(node) {
		return "", nil, false
	}
	call := node.AsCallExpression()
	name, receiver, ok := propertyName(call.Expression)
	if ok {
		return name, receiver, true
	}
	callee := unwrap(call.Expression)
	if callee != nil && ast.IsIdentifier(callee) {
		return callee.Text(), nil, true
	}
	return "", nil, false
}

func nodeText(file *ast.SourceFile, node *ast.Node) string {
	if node == nil {
		return ""
	}
	start, end := node.Pos(), node.End()
	text := file.Text()
	if start < 0 {
		start = 0
	}
	if end > len(text) {
		end = len(text)
	}
	if end < start {
		return ""
	}
	return strings.TrimSpace(text[start:end])
}

func walk(node *ast.Node, visit func(*ast.Node) bool) bool {
	if node == nil {
		return false
	}
	if visit(node) {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if walk(child, visit) {
			found = true
			return true
		}
		return false
	})
	return found
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}
