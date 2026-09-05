package effect_test_style

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var testMessage = rule.RuleMessage{
	Id:          "effect-test-style",
	Description: "Use it.effect for Effect tests.",
	Help:        "Effect-aware tests provide the correct runtime and deterministic services.",
}

var propertyMessage = rule.RuleMessage{
	Id:          "effect-test-style",
	Description: "Use it.effect.prop for Effect property tests.",
	Help:        "Effect-aware property tests execute returned Effects with the correct runtime and deterministic services.",
}

type registration struct {
	call       *ast.Node
	isProperty bool
}

var Rule = rule.Rule{Name: "effect-test-style", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	callbacks := map[*ast.Node]registration{}
	returnedEffects := map[*ast.Node]bool{}
	return rule.RuleListeners{
		ast.KindCallExpression: func(node *ast.Node) {
			registration, ok := plainEffectTestCall(ctx, node)
			if !ok {
				return
			}
			if callback := rightmostCallback(node); callback != nil {
				callbacks[callback] = registration
			} else if callback := rightmostArgument(node); callback != nil && callbackReturnsEffect(ctx, callback) {
				reportRegistration(ctx, registration)
			}
		},
		ast.KindReturnStatement: func(node *ast.Node) {
			callback := enclosingCallback(node)
			if _, ok := callbacks[callback]; ok && node.AsReturnStatement().Expression != nil && returnsEffect(ctx, node.AsReturnStatement().Expression) {
				returnedEffects[callback] = true
			}
		},
		rule.ListenerOnExit(ast.KindArrowFunction): func(node *ast.Node) {
			reportEffectCallback(ctx, callbacks, returnedEffects, node)
		},
		rule.ListenerOnExit(ast.KindFunctionExpression): func(node *ast.Node) {
			reportEffectCallback(ctx, callbacks, returnedEffects, node)
		},
	}
}}

func reportEffectCallback(ctx rule.RuleContext, callbacks map[*ast.Node]registration, returnedEffects map[*ast.Node]bool, callback *ast.Node) {
	registration, ok := callbacks[callback]
	if !ok {
		return
	}
	body := callback.BodyData().Body
	if body != nil && !ast.IsBlock(body) && returnsEffect(ctx, body) {
		reportRegistration(ctx, registration)
		return
	}
	if returnedEffects[callback] {
		reportRegistration(ctx, registration)
	}
}

func enclosingCallback(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsArrowFunction(current) || ast.IsFunctionExpression(current) {
			return current
		}
		if ast.IsFunctionLike(current) {
			return nil
		}
	}
	return nil
}

func reportRegistration(ctx rule.RuleContext, registration registration) {
	if registration.isProperty {
		ctx.ReportNode(registration.call, propertyMessage)
		return
	}
	ctx.ReportNode(registration.call, testMessage)
}

func rightmostCallback(node *ast.Node) *ast.Node {
	for index := len(node.AsCallExpression().Arguments.Nodes) - 1; index >= 0; index-- {
		callback := unwrap(node.AsCallExpression().Arguments.Nodes[index])
		if ast.IsArrowFunction(callback) || ast.IsFunctionExpression(callback) {
			return callback
		}
	}
	return nil
}

func rightmostArgument(node *ast.Node) *ast.Node {
	arguments := node.AsCallExpression().Arguments.Nodes
	if len(arguments) == 0 {
		return nil
	}
	return unwrap(arguments[len(arguments)-1])
}

func plainEffectTestCall(ctx rule.RuleContext, node *ast.Node) (registration, bool) {
	members, root := effectTestMembers(node.AsCallExpression().Expression)
	if root == nil || !isEffectVitestIt(ctx, root) {
		return registration{}, false
	}
	for _, member := range members {
		if member == "effect" || member == "live" {
			return registration{}, false
		}
	}
	return registration{call: node, isProperty: contains(members, "prop")}, true
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

func isEffectVitestIt(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	return symbol != nil && symbol.Name == "it" && declaredInVitest(symbol)
}

func returnsEffect(ctx rule.RuleContext, expression *ast.Node) bool {
	return isEffectType(ctx, ctx.TypeChecker.GetTypeAtLocation(expression))
}

func callbackReturnsEffect(ctx rule.RuleContext, callback *ast.Node) bool {
	for _, signature := range utils.GetCallSignatures(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(callback)) {
		if isEffectType(ctx, ctx.TypeChecker.GetReturnTypeOfSignature(signature)) {
			return true
		}
	}
	return false
}

func isEffectType(ctx rule.RuleContext, value *checker.Type) bool {
	if value == nil || checker.Type_flags(value)&(checker.TypeFlagsAny|checker.TypeFlagsUnknown) != 0 {
		return false
	}
	for _, part := range utils.UnionTypeParts(value) {
		if checker.Type_flags(part)&(checker.TypeFlagsAny|checker.TypeFlagsUnknown) != 0 {
			continue
		}
		symbol := checker.Type_symbol(part)
		if symbol != nil && symbol.Name == "Effect" && declaredInEffect(symbol) {
			return true
		}
	}
	return false
}

func declaredInVitest(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil {
			name := strings.ReplaceAll(file.FileName(), "\\", "/")
			if strings.Contains(name, "/node_modules/@effect/vitest/") || strings.Contains(name, "/packages/vitest/src/") {
				return true
			}
		}
	}
	return false
}

func declaredInEffect(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil {
			name := strings.ReplaceAll(file.FileName(), "\\", "/")
			if strings.Contains(name, "/node_modules/effect/") || strings.Contains(name, "/packages/effect/src/") {
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
