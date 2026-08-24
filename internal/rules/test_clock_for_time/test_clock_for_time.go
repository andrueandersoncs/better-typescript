package test_clock_for_time

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"path"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{Id: "testClockForTime", Description: "Use TestClock for time-sensitive tests.", Help: "Fork time-dependent work, then advance TestClock instead of real time."}
var TestClockForTimeRule = rule.Rule{Name: "test-clock-for-time", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	text := ctx.SourceFile.Text()
	imports := collectAPIImports(text)
	tests := effectTestNames(text)
	hasTestClock := regexp.MustCompile(`(?m)import\s+.*\bTestClock\b`).MatchString(text)
	timeNames := []string{"sleep", "timeout", "timeoutTo", "timeoutFail", "timeoutFailCause", "retry", "retryOrElse", "retryOrElseEither"}
	backoffNames := []string{"exponential", "fibonacci", "spaced", "linear", "delayed", "delayedEffect", "addDelay", "addDelayEffect", "jittered", "jitteredWith"}
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if hasTestClock || !isInsideEffectTest(node, tests) {
			return
		}
		call := node.AsCallExpression()
		if isAPICall(imports, call, "Effect", timeNames...) || isAPICall(imports, call, "Schedule", backoffNames...) {
			ctx.ReportNode(call.Expression, message)
		}
	}}
}}

type apiImports struct {
	namespaces map[string]string
	members    map[string][2]string
}

func collectAPIImports(text string) apiImports {
	result := apiImports{namespaces: map[string]string{}, members: map[string][2]string{}}
	re := regexp.MustCompile(`(?ms)^\s*import\s+(\{[^}]*\}|\*\s+as\s+[A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']`)
	for _, match := range re.FindAllStringSubmatch(text, -1) {
		clause, module := strings.TrimSpace(match[1]), match[2]
		family := ""
		if strings.HasPrefix(module, "effect/") {
			family = path.Base(module)
		}
		if strings.HasPrefix(clause, "* as ") && family != "" {
			result.namespaces[strings.TrimSpace(strings.TrimPrefix(clause, "* as "))] = family
			continue
		}
		start, end := strings.Index(clause, "{"), strings.LastIndex(clause, "}")
		if start < 0 || end <= start {
			continue
		}
		for _, item := range strings.Split(clause[start+1:end], ",") {
			parts := strings.Fields(strings.TrimSpace(item))
			if len(parts) == 0 || parts[0] == "type" {
				continue
			}
			imported, local := parts[0], parts[0]
			if len(parts) >= 3 && parts[1] == "as" {
				local = parts[2]
			}
			if module == "effect" {
				result.namespaces[local] = imported
			} else if family != "" {
				result.members[local] = [2]string{family, imported}
			}
		}
	}
	return result
}

func skipTransparent(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression,
			ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func isAPICall(imports apiImports, call *ast.CallExpression, family string, names ...string) bool {
	callee := skipTransparent(call.Expression)
	if callee == nil {
		return false
	}
	contains := func(name string) bool {
		for _, candidate := range names {
			if candidate == name {
				return true
			}
		}
		return false
	}
	if ast.IsPropertyAccessExpression(callee) {
		access := callee.AsPropertyAccessExpression()
		name := access.Name()
		receiver := skipTransparent(access.Expression)
		return name != nil && receiver != nil && receiver.Kind == ast.KindIdentifier &&
			imports.namespaces[receiver.Text()] == family && contains(name.Text())
	}
	if callee.Kind == ast.KindIdentifier {
		member, ok := imports.members[callee.Text()]
		return ok && member[0] == family && contains(member[1])
	}
	return false
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

func effectTestNames(text string) map[string]bool {
	names := map[string]bool{}
	re := regexp.MustCompile(`(?ms)^\s*import\s*\{([^}]*)\}\s*from\s*["']@effect/vitest(?:/index)?["']`)
	for _, match := range re.FindAllStringSubmatch(text, -1) {
		for _, item := range strings.Split(match[1], ",") {
			parts := strings.Fields(strings.TrimSpace(item))
			if len(parts) == 0 || parts[0] != "it" {
				continue
			}
			local := "it"
			if len(parts) >= 3 && parts[1] == "as" {
				local = parts[2]
			}
			names[local] = true
		}
	}
	return names
}

func isInsideEffectTest(node *ast.Node, names map[string]bool) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsCallExpression(current) {
			continue
		}
		callee := skipTransparent(current.AsCallExpression().Expression)
		if callee == nil {
			continue
		}
		if callee.Kind == ast.KindIdentifier && names[callee.Text()] {
			return true
		}
		if ast.IsPropertyAccessExpression(callee) {
			receiver := skipTransparent(callee.AsPropertyAccessExpression().Expression)
			if receiver != nil && receiver.Kind == ast.KindIdentifier && names[receiver.Text()] {
				return true
			}
		}
	}
	return false
}

var Rule = TestClockForTimeRule
