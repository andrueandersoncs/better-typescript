package typed_error_recovery

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "typedErrorRecovery",
	Description: "Use typed error recovery instead of broad cause recovery.",
	Help:        "Use catchIf, catchTag, catchFilter, or retry for expected typed failures.",
}

var TypedErrorRecoveryRule = rule.Rule{Name: "typed-error-recovery", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if !isCauseRecovery(ctx, node) {
			return
		}
		self := recoverySelf(node)
		if !hasTypedEffectError(ctx, self) || losslesslyReemitsCause(ctx, recoveryHandler(node)) {
			return
		}
		ctx.ReportNode(node, message)
	}}
}}

func isCauseRecovery(ctx rule.RuleContext, node *ast.Node) bool {
	return isEffectModuleCall(ctx, node, "Effect", "catchCause", "catchAllCause") || isEffectModuleCall(ctx, node, "Stream", "catchCause", "catchAllCause")
}

func recoverySelf(callNode *ast.Node) *ast.Node {
	call := callNode.AsCallExpression()
	if call.Arguments != nil && len(call.Arguments.Nodes) > 0 && !functionLikeExpression(call.Arguments.Nodes[0]) {
		return call.Arguments.Nodes[0]
	}
	parent := callNode.Parent
	if parent == nil || !ast.IsCallExpression(parent) {
		return nil
	}
	outer := parent.AsCallExpression()
	callee := unwrap(outer.Expression)
	if ast.IsPropertyAccessExpression(callee) && callee.Name() != nil && callee.Name().Text() == "pipe" {
		return callee.AsPropertyAccessExpression().Expression
	}
	if callee != nil && callee.Kind == ast.KindIdentifier && callee.Text() == "pipe" && outer.Arguments != nil && len(outer.Arguments.Nodes) > 0 {
		return outer.Arguments.Nodes[0]
	}
	return nil
}

func recoveryHandler(callNode *ast.Node) *ast.Node {
	arguments := callNode.AsCallExpression().Arguments.Nodes
	if len(arguments) == 0 {
		return nil
	}
	if functionLikeExpression(arguments[0]) {
		return arguments[0]
	}
	if len(arguments) > 1 && functionLikeExpression(arguments[1]) {
		return arguments[1]
	}
	return nil
}

func hasTypedEffectError(ctx rule.RuleContext, expression *ast.Node) bool {
	if expression == nil {
		return false
	}
	typ := ctx.TypeChecker.GetTypeAtLocation(expression)
	if typ == nil || !isEffectValueType(typ) {
		return false
	}
	arguments := checker.Checker_getTypeArguments(ctx.TypeChecker, typ)
	if len(arguments) < 2 || arguments[1] == nil {
		return false
	}
	flags := checker.Type_flags(arguments[1])
	return flags&(checker.TypeFlagsAny|checker.TypeFlagsUnknown|checker.TypeFlagsTypeParameter|checker.TypeFlagsNever) == 0
}

func isEffectValueType(typ *checker.Type) bool {
	symbol := checker.Type_symbol(typ)
	if symbol == nil || (symbol.Name != "Effect" && symbol.Name != "Stream") {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == symbol.Name+".ts" || base == symbol.Name+".d.ts" || base == "index.d.ts") && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func losslesslyReemitsCause(ctx rule.RuleContext, handler *ast.Node) bool {
	handler = unwrap(handler)
	if handler == nil || (!ast.IsArrowFunction(handler) && !ast.IsFunctionExpression(handler)) || len(handler.Parameters()) != 1 {
		return false
	}
	parameter := handler.Parameters()[0].AsParameterDeclaration()
	if !ast.IsIdentifier(parameter.Name()) || parameter.Initializer != nil || parameter.DotDotDotToken != nil {
		return false
	}
	body := handler.BodyData().Body
	if body == nil {
		return false
	}
	if ast.IsBlock(body) {
		statements := body.AsBlock().Statements.Nodes
		if len(statements) != 1 || !ast.IsReturnStatement(statements[0]) || statements[0].AsReturnStatement().Expression == nil {
			return false
		}
		body = statements[0].AsReturnStatement().Expression
	}
	return isFailCauseOf(ctx, body, parameter.Name()) || isObservedThenFailCause(ctx, body, parameter.Name())
}

func isObservedThenFailCause(ctx rule.RuleContext, expression, parameter *ast.Node) bool {
	expression = unwrap(expression)
	if expression == nil || !ast.IsCallExpression(expression) || !isEffectModuleCall(ctx, expression, "Effect", "andThen") {
		return false
	}
	arguments := expression.AsCallExpression().Arguments.Nodes
	return len(arguments) == 2 && ast.IsCallExpression(unwrap(arguments[0])) && isEffectModuleCall(ctx, unwrap(arguments[0]), "Effect", "logError") && isFailCauseOf(ctx, arguments[1], parameter)
}

func isFailCauseOf(ctx rule.RuleContext, expression, parameter *ast.Node) bool {
	expression = unwrap(expression)
	if expression == nil || !ast.IsCallExpression(expression) {
		return false
	}
	if !isEffectModuleCall(ctx, expression, "Effect", "failCause") && !isEffectModuleCall(ctx, expression, "Stream", "failCause") {
		return false
	}
	arguments := expression.AsCallExpression().Arguments.Nodes
	return len(arguments) == 1 && sameSymbol(ctx, arguments[0], parameter)
}

func sameSymbol(ctx rule.RuleContext, left, right *ast.Node) bool {
	return utils.ResolvedSymbol(ctx.TypeChecker, unwrap(left)) != nil && utils.ResolvedSymbol(ctx.TypeChecker, unwrap(left)) == utils.ResolvedSymbol(ctx.TypeChecker, unwrap(right))
}

func functionLikeExpression(node *ast.Node) bool {
	node = unwrap(node)
	return node != nil && (node.Kind == ast.KindArrowFunction || node.Kind == ast.KindFunctionExpression)
}

func isEffectModuleCall(ctx rule.RuleContext, node *ast.Node, module string, names ...string) bool {
	callee := unwrap(node.AsCallExpression().Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	return isEffectSymbol(ctx, callee, module, names...)
}

func isEffectSymbol(ctx rule.RuleContext, node *ast.Node, module string, names ...string) bool {
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	if symbol == nil {
		return false
	}
	matched := false
	for _, name := range names {
		matched = matched || symbol.Name == name
	}
	if !matched {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == module+".ts" || base == module+".d.ts" || base == "index.d.ts") && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
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

var Rule = TypedErrorRecoveryRule
