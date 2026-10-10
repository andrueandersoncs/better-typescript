package service_method_effect_fn

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
	"path"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{Id: "serviceMethodEffectFn", Description: "Wrap public Effect service operations with a named Effect.fn.", Help: "Name the operation Domain.operation and keep the generator body focused on its workflow."}

func hasNamedEffectFn(imports apiImports, node *ast.Node) bool {
	return walk(node, func(current *ast.Node) bool {
		if !ast.IsCallExpression(current) || !isAPICall(imports, current.AsCallExpression(), "Effect", "fn") {
			return false
		}
		args := current.AsCallExpression().Arguments
		return args != nil && len(args.Nodes) > 0 && ast.IsStringLiteralLike(skipTransparent(args.Nodes[0]))
	})
}
func hasEffectGen(imports apiImports, node *ast.Node) bool {
	return walk(node, func(current *ast.Node) bool {
		return ast.IsCallExpression(current) && isAPICall(imports, current.AsCallExpression(), "Effect", "gen")
	})
}
func returnsEffect(ctx rule.RuleContext, imports apiImports, node *ast.Node) bool {
	rendered := ctx.TypeChecker.TypeToString(ctx.TypeChecker.GetTypeAtLocation(node))
	if strings.Contains(rendered, "Effect<") {
		return true
	}
	return walk(node, func(current *ast.Node) bool {
		if !ast.IsCallExpression(current) {
			return false
		}
		callee := skipTransparent(current.AsCallExpression().Expression)
		if callee == nil {
			return false
		}
		if ast.IsPropertyAccessExpression(callee) {
			receiver := skipTransparent(callee.AsPropertyAccessExpression().Expression)
			return receiver != nil && receiver.Kind == ast.KindIdentifier && imports.namespaces[receiver.Text()] == "Effect"
		}
		return false
	})
}

// alwaysReturnsEffect reports whether a non-generator, non-async function's
// declared or inferred return type is an Effect on every path.
func alwaysReturnsEffect(ctx rule.RuleContext, fn *ast.Node) bool {
	if fn == nil || (fn.Kind != ast.KindFunctionDeclaration && fn.Kind != ast.KindArrowFunction && fn.Kind != ast.KindFunctionExpression) || fn.Body() == nil || fn.BodyData().AsteriskToken != nil || ast.HasSyntacticModifier(fn, ast.ModifierFlagsAsync) {
		return false
	}
	signature := ctx.TypeChecker.GetSignatureFromDeclaration(fn)
	if signature == nil {
		return false
	}
	returned := checker.Checker_getReturnTypeOfSignature(ctx.TypeChecker, signature)
	if returned == nil {
		return false
	}
	members := []*checker.Type{returned}
	if returned.IsUnion() {
		members = returned.Types()
	}
	for _, member := range members {
		if !strings.HasPrefix(ctx.TypeChecker.TypeToString(member), "Effect<") {
			return false
		}
	}
	return true
}
func constVariable(node *ast.Node) bool {
	return node.Parent != nil && node.Parent.Kind == ast.KindVariableDeclarationList && node.Parent.Flags&ast.NodeFlagsConst != 0
}

var ServiceMethodEffectFnRule = rule.Rule{Name: "service-method-effect-fn", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	imports := collectAPIImports(ctx.SourceFile.Text())
	checkVariable := func(node *ast.Node) {
		initializer := node.AsVariableDeclaration().Initializer
		if node.Name() == nil || initializer == nil || hasNamedEffectFn(imports, initializer) || hasEffectGen(imports, initializer) {
			return
		}
		if !constVariable(node) || !alwaysReturnsEffect(ctx, skipTransparent(initializer)) {
			return
		}
		ctx.ReportNode(node.Name(), message)
	}
	checkFunction := func(node *ast.Node) {
		if node.Name() == nil || hasEffectGen(imports, node) {
			return
		}
		if !alwaysReturnsEffect(ctx, node) {
			return
		}
		ctx.ReportNode(node.Name(), message)
	}
	checkClass := func(node *ast.Node) {
		text := ctx.SourceFile.Text()[node.Pos():node.End()]
		if !strings.Contains(text, "Context.Service") {
			return
		}
		walk(node, func(current *ast.Node) bool {
			if current == node || (current.Kind != ast.KindPropertyAssignment && current.Kind != ast.KindMethodDeclaration && current.Kind != ast.KindShorthandPropertyAssignment) || current.Name() == nil {
				return false
			}
			var value *ast.Node = current
			if current.Kind == ast.KindPropertyAssignment {
				value = current.AsPropertyAssignment().Initializer
			}
			if !hasNamedEffectFn(imports, value) && !hasEffectGen(imports, value) && returnsEffect(ctx, imports, value) {
				ctx.ReportNode(current.Name(), message)
			}
			return false
		})
	}
	return rule.RuleListeners{ast.KindVariableDeclaration: checkVariable, ast.KindFunctionDeclaration: checkFunction, ast.KindClassDeclaration: checkClass}
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

var Rule = ServiceMethodEffectFnRule
