package http_status_decode_order

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "http-status-decode-order",
	Description: "Classify HTTP status before decoding a successful response body.",
	Help:        "Apply filterStatusOk or an equivalent response classifier first.",
}

var Rule = rule.Rule{Name: "http-status-decode-order", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	values := map[*ast.Symbol]*ast.Node{}
	classified := map[*ast.Symbol]bool{}
	reported := map[*ast.Node]bool{}
	source := func(node *ast.Node) *ast.Node { return responseSource(ctx, values, node) }
	report := func(node, location *ast.Node) {
		if node == nil || reported[node] || isClassified(ctx, classified, node, location) {
			return
		}
		reported[node] = true
		ctx.ReportNode(node, message)
	}
	return rule.RuleListeners{
		ast.KindBinaryExpression: func(node *ast.Node) {
			if ast.IsAssignmentExpression(node, false) && ast.IsIdentifier(unwrap(node.AsBinaryExpression().Left)) {
				symbol := utils.ResolvedSymbol(ctx.TypeChecker, unwrap(node.AsBinaryExpression().Left))
				delete(values, symbol)
				delete(classified, symbol)
			}
		},
		ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if declaration.Initializer == nil || !ast.IsIdentifier(declaration.Name()) {
				return
			}
			name := declaration.Name()
			symbol := utils.ResolvedSymbol(ctx.TypeChecker, name)
			if response := source(declaration.Initializer); response != nil {
				if symbol != nil {
					values[symbol] = response
				}
				if isDomainType(ctx, declaration.Type) {
					report(response, node)
				}
			}
			if symbol != nil && classifierInput(ctx, declaration.Initializer) != nil {
				classified[symbol] = true
			}
		},
		ast.KindAsExpression: func(node *ast.Node) {
			if isDomainType(ctx, node.Type()) {
				report(source(node.AsAsExpression().Expression), node)
			}
		},
		ast.KindTypeAssertionExpression: func(node *ast.Node) {
			if isDomainType(ctx, node.Type()) {
				report(source(node.AsTypeAssertion().Expression), node)
			}
		},
		ast.KindCallExpression: func(node *ast.Node) {
			if parameter := classifierCallback(ctx, node); parameter != nil {
				classified[parameter] = true
			}
			if body := schemaDecodedResponse(ctx, values, node); body != nil {
				report(body, node)
			}
		},
		ast.KindReturnStatement: func(node *ast.Node) {
			expression := node.AsReturnStatement().Expression
			function := enclosingFunction(node)
			if expression != nil && function != nil && isDomainType(ctx, function.Type()) {
				report(source(expression), node)
			}
		},
	}
}}

func responseSource(ctx rule.RuleContext, values map[*ast.Symbol]*ast.Node, node *ast.Node) *ast.Node {
	node = unwrap(node)
	if node == nil {
		return nil
	}
	switch node.Kind {
	case ast.KindAwaitExpression:
		return responseSource(ctx, values, node.AsAwaitExpression().Expression)
	case ast.KindYieldExpression:
		return responseSource(ctx, values, node.AsYieldExpression().Expression)
	case ast.KindIdentifier:
		return values[utils.ResolvedSymbol(ctx.TypeChecker, node)]
	case ast.KindCallExpression:
		if isWebResponseJSON(ctx, node.AsCallExpression()) {
			return node
		}
	case ast.KindPropertyAccessExpression:
		if isEffectResponseJSON(ctx, node.AsPropertyAccessExpression()) {
			return node
		}
	}
	return nil
}

func schemaDecodedResponse(ctx rule.RuleContext, values map[*ast.Symbol]*ast.Node, node *ast.Node) *ast.Node {
	call := node.AsCallExpression()
	if call.Arguments == nil || len(call.Arguments.Nodes) != 1 || !isSchemaDecoderApplication(ctx, call.Expression) {
		return nil
	}
	return responseSource(ctx, values, call.Arguments.Nodes[0])
}

func isSchemaDecoderApplication(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) {
		return false
	}
	callee := unwrap(node.AsCallExpression().Expression)
	var name *ast.Node
	if ast.IsPropertyAccessExpression(callee) {
		name = callee.AsPropertyAccessExpression().Name()
	} else if ast.IsIdentifier(callee) {
		name = callee
	}
	if name == nil {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, name)
	if symbol == nil || !utils.IsEffectSchemaSymbol(symbol) {
		return false
	}
	switch symbol.Name {
	case "decodeUnknownEffect", "decodeEffect":
		return true
	default:
		return false
	}
}

func classifierInput(ctx rule.RuleContext, node *ast.Node) *ast.Symbol {
	node = unwrap(node)
	if node == nil {
		return nil
	}
	if ast.IsYieldExpression(node) {
		return classifierInput(ctx, node.AsYieldExpression().Expression)
	}
	if !ast.IsCallExpression(node) {
		return nil
	}
	call := node.AsCallExpression()
	if call.Arguments == nil || len(call.Arguments.Nodes) == 0 || !isEffectResponseClassifier(ctx, call.Expression) {
		return nil
	}
	argument := unwrap(call.Arguments.Nodes[0])
	if !ast.IsIdentifier(argument) {
		return nil
	}
	return utils.ResolvedSymbol(ctx.TypeChecker, argument)
}

func classifierCallback(ctx rule.RuleContext, node *ast.Node) *ast.Symbol {
	call := node.AsCallExpression()
	if call.Arguments == nil || len(call.Arguments.Nodes) != 2 || classifierInput(ctx, call.Arguments.Nodes[0]) == nil || !isEffectFlatMap(ctx, call.Expression) {
		return nil
	}
	callback := unwrap(call.Arguments.Nodes[1])
	if !ast.IsFunctionLike(callback) || len(callback.Parameters()) != 1 || !ast.IsIdentifier(callback.Parameters()[0].Name()) {
		return nil
	}
	return utils.ResolvedSymbol(ctx.TypeChecker, callback.Parameters()[0].Name())
}

func isEffectFlatMap(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsPropertyAccessExpression(node) {
		return false
	}
	name := node.AsPropertyAccessExpression().Name()
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, name)
	if symbol == nil || symbol.Name != "flatMap" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == "Effect.ts" || base == "Effect.d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func isEffectResponseClassifier(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsPropertyAccessExpression(node) {
		return false
	}
	name := node.AsPropertyAccessExpression().Name()
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, name)
	if symbol == nil {
		return false
	}
	switch symbol.Name {
	case "filterStatusOk", "filterStatus", "matchStatus":
	default:
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == "HttpClientResponse.ts" || base == "HttpClientResponse.d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func isClassified(ctx rule.RuleContext, classified map[*ast.Symbol]bool, source, location *ast.Node) bool {
	symbol := responseReceiver(ctx, source)
	if symbol == nil {
		return false
	}
	if classified[symbol] {
		return true
	}
	for current := location.Parent; current != nil && !ast.IsFunctionLike(current); current = current.Parent {
		if ast.IsIfStatement(current) && responseGuard(ctx, current.AsIfStatement().Expression, symbol) {
			return true
		}
	}
	statement := containingStatement(location)
	statements := containingStatements(statement)
	if statement == nil || statements == nil {
		return false
	}
	for index, candidate := range statements {
		if candidate != statement {
			continue
		}
		for _, previous := range statements[:index] {
			if !ast.IsIfStatement(previous) {
				continue
			}
			guard := previous.AsIfStatement()
			if !responseGuard(ctx, guard.Expression, symbol) {
				continue
			}
			condition := unwrap(guard.Expression)
			if ast.IsPrefixUnaryExpression(condition) && condition.AsPrefixUnaryExpression().Operator == ast.KindExclamationToken && alwaysExits(guard.ThenStatement) {
				return true
			}
			if !ast.IsPrefixUnaryExpression(condition) && guard.ElseStatement != nil && alwaysExits(guard.ElseStatement) {
				return true
			}
		}
		return false
	}
	return false
}

func responseReceiver(ctx rule.RuleContext, node *ast.Node) *ast.Symbol {
	node = unwrap(node)
	if node == nil {
		return nil
	}
	var receiver *ast.Node
	if ast.IsCallExpression(node) {
		callee := unwrap(node.AsCallExpression().Expression)
		if ast.IsPropertyAccessExpression(callee) {
			receiver = callee.AsPropertyAccessExpression().Expression
		}
	} else if ast.IsPropertyAccessExpression(node) {
		receiver = node.AsPropertyAccessExpression().Expression
	}
	receiver = unwrap(receiver)
	if receiver == nil || !ast.IsIdentifier(receiver) {
		return nil
	}
	return utils.ResolvedSymbol(ctx.TypeChecker, receiver)
}

func responseGuard(ctx rule.RuleContext, node *ast.Node, response *ast.Symbol) bool {
	node = unwrap(node)
	if ast.IsPrefixUnaryExpression(node) && node.AsPrefixUnaryExpression().Operator == ast.KindExclamationToken {
		node = unwrap(node.AsPrefixUnaryExpression().Operand)
	}
	if !ast.IsPropertyAccessExpression(node) {
		return false
	}
	access := node.AsPropertyAccessExpression()
	if access.Name().Text() != "ok" {
		return false
	}
	receiver := unwrap(access.Expression)
	return ast.IsIdentifier(receiver) && utils.ResolvedSymbol(ctx.TypeChecker, receiver) == response
}

func containingStatement(node *ast.Node) *ast.Node {
	for current := node; current != nil; current = current.Parent {
		if ast.IsStatement(current) {
			return current
		}
	}
	return nil
}

func containingStatements(statement *ast.Node) []*ast.Node {
	if statement == nil || statement.Parent == nil {
		return nil
	}
	if ast.IsBlock(statement.Parent) {
		return statement.Parent.AsBlock().Statements.Nodes
	}
	if ast.IsSourceFile(statement.Parent) {
		return statement.Parent.AsSourceFile().Statements.Nodes
	}
	return nil
}

func alwaysExits(node *ast.Node) bool {
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindReturnStatement, ast.KindThrowStatement, ast.KindBreakStatement, ast.KindContinueStatement:
		return true
	case ast.KindBlock:
		statements := node.AsBlock().Statements.Nodes
		return len(statements) > 0 && alwaysExits(statements[len(statements)-1])
	default:
		return false
	}
}

func isWebResponseJSON(ctx rule.RuleContext, call *ast.CallExpression) bool {
	if call == nil {
		return false
	}
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}
	access := callee.AsPropertyAccessExpression()
	return access.Name().Text() == "json" && isBuiltinType(ctx, access.Expression, "Response")
}

func isEffectResponseJSON(ctx rule.RuleContext, access *ast.PropertyAccessExpression) bool {
	return access != nil && access.Name().Text() == "json" && isEffectResponseType(ctx, access.Expression)
}

func isEffectResponseType(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := checker.Type_symbol(ctx.TypeChecker.GetTypeAtLocation(unwrap(node)))
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if symbol == nil || symbol.Name != "HttpClientResponse" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == "HttpClientResponse.ts" || base == "HttpClientResponse.d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func isBuiltinType(ctx rule.RuleContext, node *ast.Node, name string) bool {
	symbol := checker.Type_symbol(ctx.TypeChecker.GetTypeAtLocation(unwrap(node)))
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if (symbol == nil || symbol.Name != name) && name == "JSON" {
		symbol = utils.ResolvedSymbol(ctx.TypeChecker, unwrap(node))
	}
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		base := filepath.Base(strings.ReplaceAll(file.FileName(), "\\", "/"))
		if strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts") {
			return true
		}
	}
	return false
}

func isDomainType(ctx rule.RuleContext, node *ast.Node) bool {
	return node != nil && !isRawRepresentationType(ctx, node)
}

func isRawRepresentationType(ctx rule.RuleContext, node *ast.Node) bool {
	if node == nil {
		return true
	}
	value := ctx.TypeChecker.GetTypeAtLocation(node)
	if isRawValue(value) {
		return true
	}
	symbol := checker.Type_symbol(value)
	if symbol == nil || (symbol.Name != "Promise" && symbol.Name != "Effect") {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := filepath.ToSlash(file.FileName())
		base := filepath.Base(path)
		builtinPromise := symbol.Name == "Promise" && strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts")
		effect := symbol.Name == "Effect" && (base == "Effect.ts" || base == "Effect.d.ts") && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/"))
		if builtinPromise || effect {
			arguments := checker.Checker_getTypeArguments(ctx.TypeChecker, value)
			return len(arguments) > 0 && isRawValue(arguments[0])
		}
	}
	return false
}

func isRawValue(value *checker.Type) bool {
	if value == nil || utils.IsTypeFlagSet(value, checker.TypeFlagsAny|checker.TypeFlagsUnknown) {
		return true
	}
	alias := checker.Type_alias(value)
	return alias != nil && alias.Symbol() != nil && alias.Symbol().Name == "Json" && utils.IsEffectSchemaSymbol(alias.Symbol())
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

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}
